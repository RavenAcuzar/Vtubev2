import { Injectable } from "@angular/core";

import { Storage } from '@ionic/storage';
import { USER_DATA_KEY } from "../app.constants";
import { encodeObject, openSqliteDb } from "../app.utils";
import { SQLite, SQLiteObject } from "@ionic-native/sqlite";
import { Observable } from "rxjs/Observable";
import { Subscriber } from "rxjs/Subscriber";
import { Subject } from "rxjs/Subject";
import { HttpClient } from '@angular/common/http';

export type VoltChatEntry = {
    message: string,
    sender: string,
    senderImageUrl: string,
    dateSent: number,
    dateSentStr: string,
    selected?: boolean
};
//FIXME: TO remove until Migrated to Dialogflow v2 api
@Injectable()
export class VoltChatService {

    private chatObservable: Subject<VoltChatEntry>;
    private chatClearObservable: Subject<void>;

    constructor(
        private http: HttpClient,
        private storage: Storage,
        private sqlite: SQLite
    ) {
        this.chatObservable = new Subject();
        this.chatClearObservable = new Subject<void>();
    }

    getObservableChat() {
        return this.chatObservable;
    }

    getObservableChatClear() {
        return this.chatClearObservable;
    }

    getPreviousMessages() {
        return this.storage.get(USER_DATA_KEY).then(ud => {
            if (ud) {
                return this.prepareVoltChatTable().then(db => {
                    return db.executeSql(`SELECT * FROM volt_chat WHERE userid = ?`, [ud.id]);
                });
            } else {
                throw new Error('not_logged_in');
            }
        }).then(a => {
            try {
                let chatEntries: VoltChatEntry[] = []
                for (let i = 0; i < a.rows.length; i++) {
                    let rawChatEntry = a.rows.item(i);

                    let chatEntry: VoltChatEntry = {
                        message: rawChatEntry.message,
                        dateSent: rawChatEntry.dateSent,
                        sender: rawChatEntry.sender,
                        dateSentStr: rawChatEntry.datesent,
                        senderImageUrl: rawChatEntry.senderimageurl
                    }
                    chatEntries.push(chatEntry);
                }
                return chatEntries;
            } catch (e) {
                throw new Error();
            }
        });
    }

    sendMessage(message: string): Promise<void> {
        return this.storage.get(USER_DATA_KEY).then(ud => {
            let date = Date.now();
            let dateStr = new Date(date).toLocaleTimeString();
            let selected = true;

            let newMessage: VoltChatEntry = {
                sender: ud.first_name,
                senderImageUrl: `https://api.the-v.net/site/v2.0/picture?id=${ud.id}`,
                message: message,
                dateSent: date,
                dateSentStr: dateStr,
                selected: selected
            };

            return this.pushMessage(newMessage, ud.id).then(() => {
                let selected = true;

                return this.http.get('https://cums.the-v.net/apiai.aspx?ask=' + encodeURI(message), {responseType: 'text'})
                    .map(r => r).toPromise().then(message => {
                        let time = Date.now();
                        let timeStr = new Date(time).toLocaleTimeString();

                        return this.pushMessage({
                            message: message,
                            dateSent: time,
                            sender: 'Volt',
                            dateSentStr: timeStr,
                            senderImageUrl: 'assets/img/volt-login.png',
                            selected: selected
                        }, ud.id).then(() => { });
                    });
            });
        });
    }

    pushMessage(chatEntry: VoltChatEntry, userid: string = null): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            return this.prepareVoltChatTable().then(db => {
                let query = 'INSERT INTO volt_chat(userid, sender, senderimageurl, message, datesent) VALUES(?, ?, ?, ?, ?)';
                return db.executeSql(query, [
                    userid,
                    chatEntry.sender,
                    chatEntry.senderImageUrl,
                    chatEntry.message,
                    new Date(chatEntry.dateSent).toLocaleString()
                ]);
            }).then(a => {
                if (a.rowsAffected === 1) {
                    this.chatObservable.next(chatEntry);
                    resolve();
                } else {
                    throw new Error('not_successfully_inserted');
                }
            });
        });
    }

    deleteUserConversation() {
        return this.storage.get(USER_DATA_KEY).then(ud => {
            if (ud) {
                return this.prepareVoltChatTable().then(db => {
                    return db.executeSql(`DELETE FROM volt_chat WHERE userid = ?`, [ud.id]);
                });
            } else {
                throw new Error('not_logged_in');
            }
        }).then(a => {
            this.chatClearObservable.next();
            return true;
        });
    }

    private prepareVoltChatTable() {
        return openSqliteDb(this.sqlite).then(db => {
            return this.createVoltChatTable(db);
        });
    }

    private createVoltChatTable(db: SQLiteObject) {
        return new Promise<SQLiteObject>((resolve, reject) => {
            try {
                db.executeSql(`CREATE TABLE IF NOT EXISTS volt_chat(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        userid CHAR(36) NULL,
                        sender TEXT NOT NULL,
                        senderimageurl TEXT NOT NULL,
                        message TEXT NOT NULL,
                        datesent TEXT NOT NULL)`, [])
                    .then(() => { resolve(db); })
                    .catch(e => { reject(e); })
            } catch (e) {
                reject(e);
            }
        });
    }
}