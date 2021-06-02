import { Component } from '@angular/core';
import { NavController, NavParams, PopoverController, AlertController, InfiniteScroll, LoadingController } from 'ionic-angular';
import { HomePopoverPage } from "../../app/popover";
import { ChannelPrevPage } from "../channel-prev/channel-prev";
import { SearchPage } from "../search/search";
import { Storage } from '@ionic/storage';
import { USER_DATA_KEY, IS_LOGGED_IN_KEY } from "../../app/app.constants";
import { NowPlayingPage } from "../now-playing/now-playing";
import { FallbackPage } from "../fallback/fallback";
import { numberFormat } from "../../app/app.utils";
import { GoogleAnalyticsService } from '../../app/services/analytics.service';
import { ChannelService } from '../../app/services/channel.service';
import { ChannelDetails } from '../../app/models/channel.models';

@Component({
  selector: 'page-channels',
  templateUrl: 'channels.html',
})
export class ChannelsPage {
  userHasChannel: boolean;
  userChannelId: any;
  channelVids = [];
  hasVids=false;
  followingChannels = [];
  recommendedChannels = [];
  allChannels = [];
  userChannel :ChannelDetails;
  channelAvatar = 'https://api.the-v.net/site/v2.0/channel?id=';
  channelCover;
  num = 1;
  num2=1;
  page = 1;
  private descLabel: string = 'md-arrow-dropdown';
  private isDescriptionShown: boolean = false;
  isLoggedOut: Boolean;
  channelType: string = "myChannel";
  hideMoreRecommBtn = false;

  constructor(public navCtrl: NavController, public navParams: NavParams, protected popoverCtrl: PopoverController,
   private storage: Storage, private alertCtrl: AlertController, private gaSvc:GoogleAnalyticsService,
    private channelSvc:ChannelService, private loadingCtrl:LoadingController) {
      this.gaSvc.gaTrackPageEnter('Channels');
  }

  async ionViewDidLoad() {
    let loading = this.loadingCtrl.create({
      spinner:'crescent',
      cssClass: 'my-loading-class'
    });
    loading.present();
    await this.checkUserifLoggedIn();
    if(!this.isLoggedOut){
      await this.getUserChannel();
      await this.getChannelFollowing();
    }
    await this.getChannelRecommended(this.num2.toString());
    await this.getChannelAll(this.num.toString());
    loading.dismiss();
  }

  presentPopover(myEvent, vids) {
    let popover = this.popoverCtrl.create(HomePopoverPage, {
      videoDetails: vids
    });
    popover.present({
      ev: myEvent
    });
  }
  getChannelFollowing() {
    return this.channelSvc.getUserFollowedChannels()
    .then(response=>{
      this.followingChannels =response;
    })
  }

  getChannelRecommended(num) {
    return this.channelSvc.getChannelRecommended(num)
    .then(response=>{
      if(response.length>0 && num >= 1){
        this.recommendedChannels = this.recommendedChannels.concat(response.map(c=>{
          c.chFollowers = numberFormat(c.followers);
          return c;
        })
        );
      }
      else {
        this.hideMoreRecommBtn = true;
      }
    })
  }

  getChannelAll(num) {
    return this.channelSvc.getAllChannels(num)
    .then(response=>{
      this.allChannels = this.allChannels.concat(response.map(c => {
        c.chFollowers = numberFormat(c.followers);
        return c;
      }));
    })
  }
  loadMoreRecommended(){
    this.num +=1;
    this.getChannelRecommended(this.num.toString());
  }
  loadMoreChannel(){
    this.num2+=1;
    this.getChannelAll(this.num2.toString());
  }
  checkUserifLoggedIn(){
    return this.storage.get(IS_LOGGED_IN_KEY).then(isloggedin=>{
      if(isloggedin)
        this.isLoggedOut=false;
      else
        this.isLoggedOut=true;
    })
  }

  getUserChannel() {
   
      //let id = userDetails.id;
      return  this.channelSvc.getUserChannelDetails()
      .then(response=>{
        if(response){
        let data = response;
          this.userHasChannel = true;
          this.userChannel = data;
          this.userChannelId = data.id;
          this.channelCover = ' https://mobilevtube.the-v.net/Resources/vtube/images/ChannelBanners/'+data.id+'.png';
          console.log(this.channelCover);
          return this.getChannelVids(data.id);
      }
         else {
          //do something here if no channel is available
          this.userHasChannel = false;
          console.log("No user channel available");
        }
      });
  }
  loadMoreChannelVids(infiniteScroll: InfiniteScroll){
    this.page+=1;
    this.getChannelVids(this.userChannelId, ()=>{
      infiniteScroll.complete();
    });
  }

  getChannelVids(cId, callback?) {
    //TODO: Remove old api call use channel service
    return this.channelSvc.getChannelVideos(cId,this.page)
    .then(response=>{
      this.channelVids = this.channelVids.concat(response);
        if (this.channelVids.length <= 0) {
          this.hasVids = false;
        }
        else {
          this.hasVids = true;
          this.channelVids.map(cv => {
            cv.noLock = (cv.videoPrivacy === 'public');
            return cv;
          })
        }
        if  (callback)
          callback();
    })
    .catch(e=>{
      if  (callback)
          callback();
    })
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

  userCheckSubscription() {
    return this.storage.get(USER_DATA_KEY).then(userDetails => {
      return (userDetails.membership !== "Free")
    })
  }

  goToChannelView(id : string) {
    console.log(id);
    this.navCtrl.push(ChannelPrevPage, {
      id: id
    });
  }
  searchThing() {
    this.navCtrl.push(SearchPage);
  }
  
  goToFallback() {
    this.navCtrl.push(FallbackPage);
  }
  seeDesc() {
    this.isDescriptionShown = !this.isDescriptionShown;
    this.descLabel = this.isDescriptionShown ? 'md-arrow-dropup' : 'md-arrow-dropdown';
  }
}
