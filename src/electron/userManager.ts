// electron/userManager.ts
import fs from "fs";
import path from "path";
import { app } from "electron";
import axios from "axios";

const SERVER_URL = "http://localhost:8080";
const USER_FILE = path.join(app.getPath("userData"), "user.json");

export interface LocalUser {
	uuid: string;
}

export async function getOrCreateUser(): Promise<LocalUser> {
	if (fs.existsSync(USER_FILE)) {
		const raw = fs.readFileSync(USER_FILE, "utf-8");
		const user: LocalUser = JSON.parse(raw);
		if (user.uuid) return user;
	}

	const res = await axios.post(`${SERVER_URL}/api/relics/register`);
	const uuid = res.data;

	const user: LocalUser = { uuid };
	fs.writeFileSync(USER_FILE, JSON.stringify(user, null, 2));

	return user;
}
