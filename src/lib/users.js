import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const DATA_FILE = path.join(process.cwd(), "src", "data", "users.json");

function readUsers() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, "[]");
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

/** Get a user by email (case-insensitive) */
export function getUser(email) {
  const users = readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/** Create a new user. Returns the user or throws if email already taken. */
export async function createUser({ email, password, name }) {
  const users = readUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) throw new Error("An account with this email already exists.");

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = {
    id: randomUUID(),
    email,
    name: name || email.split("@")[0],
    hashedPassword,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return { id: user.id, email: user.email, name: user.name };
}
