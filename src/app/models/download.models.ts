import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";

export type DownloadEntry = {
    id: number,
    bcid: string,
    memid: string,
    title: string,
    channelName: string,
    time: string,
    dl_date: Date,
    imageUrl: string,

    isInProgress?: boolean,
    progress?: {
        progress: number,
        hasErrors: boolean,
        isDownloading: boolean,
        subscription: Subscription
    }
} 