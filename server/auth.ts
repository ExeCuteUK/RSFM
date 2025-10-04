import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import type { IStorage } from "./storage";
import type { User, InsertUser } from "@shared/schema";

export function setupAuth(storage: IStorage) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });
}

export async function registerUser(
  storage: IStorage,
  userData: InsertUser
): Promise<User> {
  const existingUser = await storage.getUserByUsername(userData.username);
  if (existingUser) {
    throw new Error("Username already exists");
  }

  const userCount = await storage.getUserCount();
  const isFirstUser = userCount === 0;

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const newUser = await storage.createUser({
    ...userData,
    password: hashedPassword,
    isAdmin: isFirstUser,
  });

  return newUser;
}
