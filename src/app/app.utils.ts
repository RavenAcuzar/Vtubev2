import { SQLite } from "@ionic-native/sqlite";
import { SQLITE_DB_NAME } from "./app.constants";


/////////////////////Number Formater for followers, likes, views, etc//////////////////

export interface StringMap {
    [id: string]: any
}

const AMPERSAND = '&'
const EQUALS = '='
export function encodeObject(object: StringMap) {
    let encStrArray = []
    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            let o = object[key]
            encStrArray.push(key, EQUALS, encodeURIComponent(String(o)), AMPERSAND)
        }
    }
    encStrArray.pop()
    return encStrArray.join('');
}
export function formatDate(date:Date) {
    var monthNames = [
        "January", "February", "March",
        "April", "May", "June", "July",
        "August", "September", "October",
        "November", "December"
    ];

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return monthNames[monthIndex] + ' ' + day + ', ' + year;
}

export function openSqliteDb(sqlite: SQLite) {
    return sqlite.create({
        name: SQLITE_DB_NAME,
        location: 'default'
    })
}

export function numberFormat(number){
    let num=parseInt(number);
    if(num >=1000000){
        return Math.floor(num/1000000).toString() +'M';
    }else if(num >=1000){
        return Math.floor(num/1000).toString() +'K';
    }else
        return number;
}
// export function sanitizeJson(s){
//     //.replace(/(?<![{: \[\\,]) *(?!\" ?[,\]}:] *)\"/g, "'").replace(/\r?\n|\r/g, ""));
//     let x = s.text().replace(/<\/?[^>]+(>|$)/g, "").replace(/\r?\n|\r/g, "").replace(/(?<![{: \[\\,]) *(?!\" ?[,\]}:] *)\"/g, "\\\"");
//     console.log(x);
//     return JSON.parse(x);
// }