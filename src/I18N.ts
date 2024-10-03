export function formatNumber(num: number) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export function isoDate(dateTime: Date | string): string {
    return (typeof dateTime === "string" ? dateTime : dateTime.toISOString()).split("T")[0];
}

export function isoTime(dateTime: Date | string): string {
    return (typeof dateTime === "string" ? dateTime : dateTime.toISOString()).split("T").at(1) || "";
}

export function addDays(dateTime: Date, days: number) {
    const d = new Date(dateTime)
    d.setDate(d.getDate() + days)
    return d
}

export function toUnicode(value: string) {
    return "\\u" +
        value
            .split("")
            .map((char) => addZeros(char.charCodeAt(0).toString(16)))
            .join("\\u");


    function addZeros(str: string) {
        return ("0000" + str).slice(-4);
    }
}

