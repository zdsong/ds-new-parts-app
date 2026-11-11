export const formatDate = (dateStr: string): string => {
    if (!dateStr) {
        return '';
    }

    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart) {
        return '';
    }

    const dateMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!dateMatch) {
        return '';
    }
    const [, year, month, day] = dateMatch;
    let result = `${year}年${month}月${day}日`;

    if (timePart) {
        const timeMatch = timePart.match(/^(\d{1,2})[:-](\d{1,2})[:-](\d{1,2})$/);
        if (timeMatch) {
            const [, hour, minute, second] = timeMatch;
            result += ` ${hour}:${minute}`;
        }
    } else {
        result += ` 00:00`;
    }

    return result;
};