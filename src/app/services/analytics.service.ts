import { Injectable } from "@angular/core";
import { GoogleAnalytics } from '@ionic-native/google-analytics';

@Injectable()
export class GoogleAnalyticsService {
    private static trackingID = 'UA-4023891-13';
    constructor(private ga: GoogleAnalytics) { }

    gaTrackPageEnter(page: string) {
        this.ga.startTrackerWithId(GoogleAnalyticsService.trackingID)
            .then(() => {
                console.log('Google analytics is ready now');
                this.ga.trackView(page).then(()=>{
                    console.log('Page Tracked!');
                });
            })
            .catch(e => console.log('Error starting GoogleAnalytics', e));
    }

    gaEventTracker(eventCategory: string, eventAction: string, eventDesc: string) {
        this.ga.startTrackerWithId(GoogleAnalyticsService.trackingID)
            .then(() => {
                this.ga.trackEvent(eventCategory, eventAction, eventDesc);
                console.log('Event Tracked!');
            })
            .catch(e => console.log('Error starting GoogleAnalytics', e));
    }
}