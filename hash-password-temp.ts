import bcrypt from "bcryptjs";

async function hashPassword() {
  const password = "2150Prs2!";
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
  process.exit(0);
}

hashPassword();
