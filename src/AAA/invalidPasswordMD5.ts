import { existsSync, readFileSync } from "fs";
import { exMsg } from "../functions";

export const InvalidPasswordMD5 = {
    "d41d8cd98f00b204e9800998ecf8427e": 1,
    "c4ca4238a0b923820dcc509a6f75849b": 1,
    "c81e728d9d4c2f636f067f89cc14862c": 1,
    "eccbc87e4b5ce2fe28308fd9f2a7baf3": 1,
    "a87ff679a2f3e71d9181a67b7542122c": 1,
    "e4da3b7fbbce2345d7772b0674a318d5": 1,
    "1679091c5a880faf6fb5e6087eb1b2dc": 1,
    "8f14e45fceea167a5a36dedd4bea2543": 1,
    "c9f0f895fb98ab9159f51fd0297e236d": 1,
    "45c48cce2e2d7fbdea1afc51c7c6ad26": 1,
    "cfcd208495d565ef66e7dff9f98764da": 1,
    "c20ad4d76fe97759aa27a0c99bff6710": 1,
    "202cb962ac59075b964b07152d234b70": 1,
    "81dc9bdb52d04dc20036dbd8313ed055": 1,
    "827ccb0eea8a706c4c34a16891f84e7b": 1,
    "21232f297a57a5a743894a0e4a801fc3": 1,
    "4eae18cf9e54a0f62b44176d074cbe2f": 1,
    "76419c58730d9f35de7ac538c2fd6737": 1,
    "d8578edf8458ce06fbc5bb76a58c5ca4": 1,
    "5ee43561ed4491c7d2b76f28574093fc": 1
};

export function initByFile(filePath: string) {
    if (!existsSync(filePath))
        throw new Error(`${filePath} not found`)
    try {
        const lines = readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter(Boolean)
        lines.forEach((l: string) => InvalidPasswordMD5[l] = 1)
        return InvalidPasswordMD5
    } catch (ex) {
        throw new Error(`Unable to read file ${filePath}: ${exMsg(ex)}`)
    }
}