import { readdirSync, statSync } from "fs";

export function findFile(dir: string, fileName: string) {
    const files = readdirSync(dir);

    for (const file of files) {
        const filePath = `${dir}/${file}`;
        const fileStat = statSync(filePath);
        if (fileStat.isDirectory()) {
            const found = findFile(filePath, fileName);
            if (found) return found
        }
        else if (file === fileName)
            return filePath
    }
}
