import { Component } from '@angular/core';
import { NavController, NavParams, PopoverController, AlertController, InfiniteScroll, LoadingController } from 'ionic-angular';
import { HomePopoverPage } from "../../app/popover";
import { Storage } from "@ionic/storage";
import { IS_LOGGED_IN_KEY, USER_DATA_KEY } from "../../app/app.constants";
import { NowPlayingPage } from "../now-playing/now-playing";
import { FallbackPage } from "../fallback/fallback";
import { VideoDetails } from "../../app/models/video.models";
import { ChannelService } from "../../app/services/channel.service";

import { GoogleAnalyticsService } from '../../app/services/analytics.service';
import { ChannelDetails } from '../../app/models/channel.models';

@Component({
  selector: 'page-channel-prev',
  templateUrl: 'channel-prev.html',
})
export class ChannelPrevPage {

  channelCover: string;
  private videoDetails: VideoDetails;
  id: number = null;
  channelDetail: ChannelDetails=<ChannelDetails>{};
  channelVids = [];
  hasVids = true;
  page = 1;
  thumbnail;
  private isFollowing = false;

  private descLabel: string = 'md-arrow-dropdown';
  private isDescriptionShown: boolean = false;
  constructor(public navCtrl: NavController, public navParams: NavParams, public popoverCtrl: PopoverController,
    private storage: Storage,
    private alertCtrl: AlertController,
    private channelService: ChannelService,
    private gaSvc:GoogleAnalyticsService,
    private loadingCtrl:LoadingController) {
      let loading = this.loadingCtrl.create({
        spinner:'crescent',
        cssClass: 'my-loading-class'
      });
      loading.present();
      this.getChannelDatails().then(()=>{
        this.getChannelVids(null,loading);
      })
    
  }
  ionViewCanEnter() {
   
  }

  async getChannelDatails() {
    //this.id = null;
    //this.channelDetail;
    this.id = this.navParams.get('id');

    
     this.isFollowing = await this.channelService.isFollowing(this.id)
     this.channelDetail = await this.channelService.getDetailsOf(this.id);
     console.log(this.channelDetail);
     this.channelavatar(this.channelDetail.thumbnail);
     this.gaSvc.gaTrackPageEnter('Channel: '+this.channelDetail.name);
     this.channelCover = 'https://mobilevtube.the-v.net//Resources/vtube/images/ChannelBanners/'+this.id+'.png';
  }
  channelavatar(value){
    this.thumbnail=value;
  }
  getChannelVids(callback?, loading?) {
    this.id = null;
    this.id = this.navParams.get('id');
    this.channelService.getChannelVideos(this.id,this.page)
    .then(data=>{
      this.channelVids = this.channelVids.concat(data);
      if (this.channelVids.length <= 0) {
        this.hasVids = false;
      }
      else {
        this.hasVids = true;
        //this.channelVids = this.channelVids.concat(data);
        this.channelVids.map(cv => {
          cv.noLock = (cv.videoPrivacy === 'public');
          return cv;
        })
        console.log(this.channelVids);
      }
      if (callback)
        callback();
      if(loading)
        loading.dismiss();
        //callback.dismiss();
    })
    .catch(e=>{
      if (callback)
        callback();
        if(loading)
        loading.dismiss();
    })
  }
  followChannel() {

        this.channelService.follow(this.id).then(isSuccessful => {
          if (!isSuccessful)
            return;
          this.channelService.isFollowing(this.id).then(isFollowing => {
            this.isFollowing = isFollowing;
          });
        });
      
  }

  unfollowChannel() {

        this.channelService.unfollow(this.id).then(isSuccessful => {
          if (!isSuccessful)
            return;

          this.channelService.isFollowing(this.id).then(isFollowing => {
            this.isFollowing = isFollowing;
          });
        });
      
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
        this.goToFallback();
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
  loadMoreChannelVids(infiniteScroll: InfiniteScroll) {
    this.page += 1;
    this.getChannelVids(() => {
      infiniteScroll.complete();
    });
  }

  userCheckSubscription() {
    return this.storage.get(USER_DATA_KEY).then(userDetails => {
      return (userDetails.membership !== "Free")
    })
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ChannelPrevPage');
  }
  presentPopover(myEvent, vids) {
    let popover = this.popoverCtrl.create(HomePopoverPage, {
      videoDetails: vids
    });
    popover.present({
      ev: myEvent
    });
  }
  goToFallback() {
    this.navCtrl.push(FallbackPage);
  }
  seeDesc() {
    this.isDescriptionShown = !this.isDescriptionShown;
    this.descLabel = this.isDescriptionShown ? 'md-arrow-dropup' : 'md-arrow-dropdown';
  }

}
