import { Component } from '@angular/core';
import { NavController, NavParams, AlertController, LoadingController, PopoverController } from 'ionic-angular';
import { IS_LOGGED_IN_KEY, USER_DATA_KEY } from "../../app/app.constants";
import { NowPlayingPage } from "../now-playing/now-playing";
import { FallbackPage } from "../fallback/fallback";
import { Storage } from "@ionic/storage"
import { HomePopoverPage } from "../../app/popover";
import { GoogleAnalyticsService } from '../../app/services/analytics.service';
import { HTTP } from '@ionic-native/http';


@Component({
  selector: 'page-search',
  templateUrl: 'search.html',
})
export class SearchPage {

  SearchResults = [];
  keyword = '';
  hideResults = true;
  constructor(public navCtrl: NavController,
    private alertCtrl: AlertController,
    public navParams: NavParams,
    private http: HTTP,
    private storage: Storage,
    private popoverCtrl: PopoverController,
    private loading: LoadingController,
    private gaSvc: GoogleAnalyticsService) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SearchPage');
    this.gaSvc.gaTrackPageEnter('Search');
  }

  onInput() {
    let req;
    let loader = this.loading.create({ content: "Loading...", enableBackdropDismiss: true });
    if (this.keyword === '') {
      this.SearchResults = [];
      this.hideResults = true;
    } else {
      this.hideResults = false;
      this.SearchResults = [];
      let details = [];
      let body = {"search": this.keyword };

      
       let headers=  {'Content-Type': 'application/json'}
          
        
      
      loader.onDidDismiss(() => {
        req.unsubscribe();
      });
      loader.present().then(() => {
        this.http.setDataSerializer('json');
        req = this.http.post('https://api.the-v.net/video/search/video', body, headers)
          .then(response => {
            let data = JSON.parse(response.data);
            data.forEach(sr=>{
              sr.bcid = sr.URL.substring('/vtube/video?id='.length);
              sr.vidImage = sr.image.substring(`http://site.the-v.net/Widgets_Tube/VideoImage.ashx?id=${sr.URL.substring('/vtube/video?id='.length)}&amp;image=`.length);
              //sr.viewsNo = details[0].views;
              //sr.chName = details[0].channelName;
              //sr.vidImage = details[0].image;
              //sr.vidPoints = details[0].points;
              sr.noLock = (sr.videoPrivacy === 'public');
              sr.vidPriv = sr.videoPrivacy;
              return sr;
            })
            // data.forEach(sr => {
            //   this.getVideoDetails(sr.URL.substring('/vtube/video?id='.length)).subscribe(response => {
            //     details = response.json();
            //     sr.bcid = sr.URL.substring('/vtube/video?id='.length);
            //     sr.viewsNo = details[0].views;
            //     sr.chName = details[0].channelName;
            //     sr.vidImage = details[0].image;
            //     sr.vidPoints = details[0].points;
            //     sr.noLock = (details[0].videoPrivacy === 'public');
            //     sr.vidPriv = details[0].videoPrivacy;
            //   }, e => {
            //     console.log(e);
            //   }, () => {
            //   });
            //   return sr;
            // })
            this.SearchResults = data;
            if (this.SearchResults.length <= 0) {
              this.hideResults = true;
            }
            loader.dismiss();
          }, e => {
            loader.dismiss();
            console.log(e);
          });
      });
    }
  }

  playVideo(id: string, videoPrivacy: string) {
    this.storage.get(IS_LOGGED_IN_KEY).then(loggedIn => {
      if (videoPrivacy == "public") {
        //go to vid
        this.navCtrl.push(NowPlayingPage, {
          id: id
        });
      }
      else if (!loggedIn && videoPrivacy == "private") {
        //go to fallback
        this.navCtrl.push(FallbackPage);
      } else if (loggedIn && videoPrivacy == "private") {
        //check subscription
        this.userCheckSubscription().then(sub => {
          if (sub) {
            this.navCtrl.push(NowPlayingPage, {
              id: id
            });
          }
          else {
            let alert = this.alertCtrl.create({
              title: 'Upgrade to premium',
              message: 'Upgrade to premium account to access this feature.',
              buttons: [{
                text: 'OK',
                handler: () => {
                  alert.dismiss();
                  return false;
                }
              }
              ]
            })
            alert.present();
          }
          //if true go to vid
          //else show alert- prompt user to upgrade subscrption
        })
      }
    })

  }
  userCheckSubscription() {
    return this.storage.get(USER_DATA_KEY).then(userDetails => {
      return (userDetails.membership !== "Free")
    })
  }
  // getVideoDetails(bcid) {
  //   let body = new URLSearchParams();
  //   body.set('action', 'Video_GetDetails');
  //   body.set('bcid', bcid);

  //   let options = new RequestOptions({
  //     headers: new Headers({
  //       'Content-Type': 'application/x-www-form-urlencoded'
  //     })
  //   });
  //   return this.http.post('https://cums.the-v.net/site.aspx', body, options)
  // }
  presentPopover(myEvent, vids) {
    let popover = this.popoverCtrl.create(HomePopoverPage, {
      videoDetails: vids
    });
    popover.present({
      ev: myEvent
    });
  }

  onCancel() {

  }
}
