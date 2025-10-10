import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import passport from "passport";
import { setupAuth } from "./auth";
import { storage } from "./storage";

const app = express();

// Trust first proxy - required for secure cookies behind Replit's reverse proxy
app.set('trust proxy', 1);

// Skip body parsers for multipart/form-data (file uploads)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'];
  if (req.path === '/api/objects/upload') {
    console.log('[MIDDLEWARE DEBUG] Upload route - Content-Type:', contentType);
    console.log('[MIDDLEWARE DEBUG] req.is multipart?:', req.is('multipart/form-data'));
  }
  if (req.is('multipart/form-data')) {
    return next();
  }
  express.json()(req, res, next);
});
app.use((req, res, next) => {
  if (req.is('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: false })(req, res, next);
});

// Session configuration - MUST be set up before routes
app.use(
  session({
    store: storage.sessionStore,
    secret: process.env.SESSION_SECRET || "freight-manager-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
    },
  })
);

// Initialize Passport - MUST be set up before routes
setupAuth(storage);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
      console.error('Please set the following environment variables and restart the server.');
      process.exit(1);
    }

    // Log startup information
    log('🚀 Starting R.S Freight Manager server...');
    log(`Environment: ${app.get("env") || 'development'}`);
    
    // Ensure session store is ready before starting server
    log('Initializing session store...');
    await new Promise((resolve) => {
      // Give session store a moment to initialize
      setTimeout(resolve, 100);
    });
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`✅ Server successfully started on port ${port}`);
      log(`🌐 Access the application at http://0.0.0.0:${port}`);
    });

    // Handle server listen errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use. Please free the port or set a different PORT environment variable.`);
      } else if (error.code === 'EACCES') {
        console.error(`❌ Permission denied to bind to port ${port}. Try using a port number above 1024.`);
      } else {
        console.error('❌ Server error:', error.message);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Fatal error during server startup:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
})();
