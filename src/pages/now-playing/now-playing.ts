import { Component, ViewChild, ChangeDetectorRef, ElementRef} from '@angular/core';
import { NavController, NavParams, AlertController, PopoverController, ToastController,LoadingController } from 'ionic-angular';
import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { Subscription } from "rxjs/Subscription";
import { Storage } from '@ionic/storage';
import { IS_LOGGED_IN_KEY, USER_DATA_KEY } from "../../app/app.constants";
import { VideoDetails, VideoComment } from "../../app/models/video.models";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { Observable } from "rxjs/Observable";
import { DownloadService } from "../../app/services/download.service";
import { HomePopoverPage } from "../../app/popover";
import { ChannelService } from "../../app/services/channel.service";
import { PlaylistService } from "../../app/services/playlist.service";
import { LoginPage } from "../login/login";
import { GoogleAnalyticsService } from '../../app/services/analytics.service';
import { FallbackPage } from '../fallback/fallback';
import { PlaylistEntry } from '../../app/models/playlist.models';
import { VideoService } from "../../app/services/video.service";
import { PushNotificationService } from '../../app/services/pushnotif.service';

@Component({
  selector: 'page-now-playing',
  templateUrl: 'now-playing.html'
})
export class NowPlayingPage {
  @ViewChild('videoPlayer') videoplayer: ElementRef;
  @ViewChild('content') content;

  private videoId: string;
  private videoDetails: VideoDetails;
  private playlistVideoIds: PlaylistEntry[] = [];
  private playlistVideoDetails: VideoDetails[] = [];
  private relatedVideoDetails: VideoDetails[] = [];
  private videoComments: void | VideoComment[] = [];

  private safeVideoUrl: SafeResourceUrl;
  private userImageUrl: string;

  private numOfChannelFollowers = 0;
  private relatedVideosPage = 1;
  private playlistIndex = 0;
  private downloadProgress: number = 0;
  private downloadProgressSubscription: Subscription;

  private isLoading = false;
  private isLoggedIn = false;
  private isVideoDownloaded = false;
  private isVideoDownloading = false;
  private isVideoAddedToPlaylist = false;
  private isStarting = false;
  private isFollowing = false;
  private hasBeenLiked = false;
  private hasNotified = false;
  private showTooltip = false;

  private shouldPlayPlaylist = false;
  private isDisplayingPlaylist = false;

  private commentContent: string = '';

  private vidDescButtonIcon: string = 'md-arrow-dropdown';
  private isDescriptionShown: boolean = false;
  private isVideoFullscreen: boolean = false;
  private orientationSubscription: Subscription;
  private isVideoDownloadable = false;

  private readonly mainUrl: string = "https://players.brightcove.net/3745659807001/4JJdlFXsg_default/index.html?videoId=";

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private screenOrientation: ScreenOrientation,
    private videoService: VideoService,
    private downloadService: DownloadService,
    private channelService: ChannelService,
    private playlistService: PlaylistService,
    private storage: Storage,
    private alertController: AlertController,
    private sanitizer: DomSanitizer,
    private ref: ChangeDetectorRef,
    private popoverCtrl: PopoverController,
    private toastCtrl: ToastController,
    private gaSvc:GoogleAnalyticsService,
    private loadingCtrl:LoadingController,
    private pushNotifSvc: PushNotificationService
  ) {
    this.shouldPlayPlaylist = navParams.get('playAll');
    this.videoId = navParams.get('id');
    
      
      // videoPlayerNE.load(()=>{
      //   videoPlayerNE.contents().find("head")
      //   .append(`<style type='text/css'>
      //     body{
      //         width: 100vw !important; }
      //         div{
      //           width: 100vw !important; }
      //           video{
      //             width: 100vw !important; }  </style>`);
      // })import { FallbackPage } from '../fallback/fallback';
      
  }
  notify(type){
    //open sqlite, check if channel ID exists, if not, save channel ID and current date, else return 'notified'
    //save channel ID and current date with USERID, to sqlite
    if(type=='add'){
      this.storage.get(USER_DATA_KEY)
      .then(userData=>{
        this.videoService.notifyChannel(this.videoDetails.channelId.toString(), userData.id)
        .then(res=>{
          this.hasNotified = res;
          if(res)
          this.pushNotifSvc.subscribeTo(this.videoDetails.channelId.toString());
        })
        .catch(e=>{
          console.log(e);
        });
      })
      
    }
    else if(type=='remove'){
        this.videoService.removeNotifyChannel(this.videoDetails.channelId.toString())
        .then(res=>{
          if(res){
            this.hasNotified = false;
            this.pushNotifSvc.unsubscribeTo(this.videoDetails.channelId.toString());
          }
        })
        .catch(e=>{
          console.log(e);
        });
    }
  }
  loaded() {
   // this.videoplayer.nativeElement.contentDocument.body.style.width="100vw";
    //console.log(this.videoplayer.nativeElement.contentDocument.body);
    //y.contentDocument.body.div.setAttribute("style","width:100vw;");
   // y.contentDocument.body.div.video.setAttribute("style","width:100vw;");
  }
  // ngAfterViewInit(){
  //   this.loaded();
  // }
  redirectToFallback(){
    this.navCtrl.push(FallbackPage);
  }
  
  ionViewDidLoad(){ 
    
    this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.mainUrl + this.videoId);
    this.screenOrientation.unlock();
    this.orientationSubscription = this.screenOrientation.onChange().subscribe(() => {
      this.isVideoFullscreen = !this.isOrientationPortrait(this.screenOrientation.type);
      //this.videoplayer.nativeElement.contentDocument.location.reload();
      //this.loaded();
      //this.videoplayer.nativeElement.contentDocument.body.style.width="100vw";
      //this.videoplayer.nativeElement.contentDocument.body.div.style.width="100vw";
      //this.videoplayer.nativeElement.contentDocument.body.div.video.style.width="100vw";
      //console.log(this.videoplayer.nativeElement.contentDocument.body);
    });
    if (!this.shouldPlayPlaylist) {
       this.goToVideo(this.videoId);
    } else {
       this.getPlaylistAndPlayFirstVideo();
    }
    
    this.downloadService.checkIfVideoDownloadable(this.videoId)
    .then(r=>{
      this.isVideoDownloadable = r;
    })
  }

  ionViewWillLeave() {
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
    this.orientationSubscription.unsubscribe();
    if(this.downloadProgressSubscription)
    this.downloadProgressSubscription.unsubscribe();
  }

  presentPopover(myEvent, vids) {
    let popover = this.popoverCtrl.create(HomePopoverPage, { videoDetails: vids });
    popover.present({ ev: myEvent });
  }

  toggleDescriptionVisibility() {
    this.isDescriptionShown = !this.isDescriptionShown;
    this.vidDescButtonIcon = this.isDescriptionShown ? 'md-arrow-dropup' : 'md-arrow-dropdown';
  }

  loadRelatedVideo() {
    this.videoService.getRelatedVideos(this.videoId, 5, ++this.relatedVideosPage).then(relatedVideos => {
      this.relatedVideoDetails = this.relatedVideoDetails.concat(relatedVideos);
      console.log(this.relatedVideoDetails);
    });
  }

  likeVideo() {
    if (this.hasBeenLiked) {
      return;
    } else {
      // retrieve first the details of the user
      this.storage.get(USER_DATA_KEY).then(userData => {
        // user is not logged in if the userdata is null
        if (userData) {
          // request add like to video
          return this.videoService.addLike(this.videoId, userData.id);
        } else {
          throw new Error('not_logged_in');
        }
      }).then(isSuccessful => {
        // check if the video has been successfully liked
        this.hasBeenLiked = isSuccessful;
        if (isSuccessful)
          // refresh the number of likes
          return this.videoService.getLikes(this.videoId);
        else
          // something went wrong during request of add like
          throw new Error('not_liked_successfully');
      }).then(numOfLikes => {
        // update the number of likes
        this.videoDetails.likes = numOfLikes;
      }).catch(e => {
        if (e instanceof Error) {
          switch (e.message) {
            case 'not_logged_in':
              let toast = this.toastCtrl.create({
                duration: 2000,
                position: 'bottom',
                showCloseButton: true,
                closeButtonText: 'Login',
                //dismissOnPageChange: true,
                message: 'Login to like this video.',
              });
              
              toast.onDidDismiss((data, role) => {
                if(role == "close")
                  this.navCtrl.push(LoginPage);
              });
              toast.present();
              break;
            case 'multiple_entries':
            case 'never_gonna_happen':
            case 'not_liked_successfully':
            default:
              this.showErrorAlertOnVideoLike();
              break;
          }
        } else {
          this.showErrorAlertOnVideoLike();
        }
      });
    }
  }

  commentOnVideo() {
    // retrieve first the details of the user
    this.storage.get(IS_LOGGED_IN_KEY).then(isLogged => {
      if (isLogged) {
        // request for add comment to video
        return this.videoService.addComment(this.videoId, this.commentContent)
        .then(r=>{return r;});
      } else {
        throw new Error('not_logged_in');
      }
    }).then(isSuccessful => {
      // check if the comment was successfully posted
      if (isSuccessful) {
        // refresh comment section and clear comment box
        this.commentContent = '';
        this.videoService.getComments(this.videoId).then(comments => {
          this.videoComments = comments;
        });
      } else {
        this.showErrorAlertOnVideoComment();
      }
    }).catch(e => {
      let unknownError = (e) => {
        console.error(JSON.stringify(e));
        this.showErrorAlertOnVideoComment();
      };

      if (e instanceof Error) {
        switch (e.message) {
          case 'not_logged_in':
            let toast = this.toastCtrl.create({
              duration: 2000,
              position: 'bottom',
              showCloseButton: true,
              closeButtonText: 'Login',
              //dismissOnPageChange: true,
              message: 'Login to comment on this video.',
            });
            toast.onDidDismiss(
              (data, role) => {
                console.log(role);
                if (role == "close") {
                  this.navCtrl.push(LoginPage);
                }
              });
            toast.present();
            break;
          default:
            unknownError(e);
            break;
        }
      } else {
        unknownError(e);
      }
    });
  }

  addVideoToPlaylist() {
    if (this.isVideoAddedToPlaylist) {
      this.showAlertVideoAlreadyInPlaylist();
    } else {
      // retrieve first the details of the user
      this.storage.get(USER_DATA_KEY).then(userData => {
        // user is not logged in if the userdata is null
        if (userData) {
          return this.playlistService.addVideoFor(userData.id,this.videoDetails)
          .then(r=>{
            return r;
          });
          //return this.videoService.addToPlaylist(this.videoId, userData.id);
        } else {
          throw new Error('not_logged_in');
        }
      }).then(isSuccessful => {
        if (isSuccessful) {
          this.isVideoAddedToPlaylist = true;
          this.showAlertVideoAddedToPlaylist();
        } else {
          this.showAlertVideoNotAddedToPlaylist();
        }
      }).catch(e => {
        let unknownError = (e) => {
          console.log(e);
          this.showErrorAlertOnVideoPlaylist();
        };

        if (e instanceof Error) {
          switch (e.message) {
            case 'not_logged_in':
              let toast = this.toastCtrl.create({
                duration: 2000,
                position: 'bottom',
                showCloseButton: true,
                closeButtonText: 'Login',
                //dismissOnPageChange: true,
                message: 'Login to add this video to your playlist.',
              });
              toast.onDidDismiss((data, role) => {
                if(role == "close")
                this.navCtrl.push(LoginPage);
              });
              toast.present();
              break;
            case 'already_in_playlist':
              this.showAlertVideoAlreadyInPlaylist();
              break;
            default:
              unknownError(e);
              break;
          }
        } else {
          unknownError(e);
        }
      });
    }
  }

  downloadVideo() {
    if (this.isStarting || this.isVideoDownloading) {
      return;
    } else if (this.isVideoDownloaded) {
      this.showAlertVideoHasAlreadyBeenDownloaded();
    } else {
      this.isStarting = true;
      this.storage.get(USER_DATA_KEY).then(userData => {
        if (userData) {
          return this.videoService.download(this.videoId, userData.id, userData.irid);
        } else {
          throw new Error('not_logged_in');
        }
      }).then(observable => {
        console.log(observable);
        this.observeInProgressDownload(this.videoId, observable);
      }, error => {
        throw error;
      }).catch(e => {
        let unknownError = (e) => {
          console.log(e);
          this.showErrorAlertOnVideoDownload();
        };

        if (e instanceof Error) {
          switch (e.message) {
            case 'video_not_downloadable':
              this.showAlertVideoCannotBeDownloaded();
              break;
            case 'not_logged_in':
              let toast = this.toastCtrl.create({
                duration: 2000,
                position: 'bottom',
                showCloseButton: true,
                closeButtonText: 'Login',
                //dismissOnPageChange: true,
                message: 'Login to download this video.',
              });
              toast.onDidDismiss((data, role) => {
                if(role == "close")
                this.navCtrl.push(LoginPage);
              });
              toast.present();
              break;
            case 'already_downloaded':
              this.showAlertVideoHasAlreadyBeenDownloaded();
              break;
            default:
              unknownError(e);
              break;
          }
        } else {
          unknownError(e);
        }
      });
    }
  }

  goToVideo(id: string, playFromPlaylist: boolean = false, hasLoading?) {
    this.relatedVideosPage = 1;
    if (!playFromPlaylist && this.shouldPlayPlaylist) {
      this.shouldPlayPlaylist = false;
      this.isDisplayingPlaylist = false;
      this.playlistIndex = 0;
      this.playlistVideoIds = [];
      this.playlistVideoDetails = [];
    }

    this.isLoading = true;
    let loading;
    if(hasLoading){
      loading = hasLoading;
    }
    else{
    loading = this.loadingCtrl.create({
			spinner:'crescent',
			cssClass: 'my-loading-class'
		});
		loading.present();
  }
    this.videoId = id;
    // initialize screen orientation variable
    this.isVideoFullscreen = !this.isOrientationPortrait(this.screenOrientation.type);

    // get video information
    let detailsPromise = this.videoService.getDetails(this.videoId).then(details => {
      this.videoDetails = details;
      this.gaSvc.gaTrackPageEnter('Watched: '+ details.title);
      this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.mainUrl + this.videoId);
      // this.storage.get(APP_LANG).then(lang=>{
      //   if(lang != null && lang != "en"){
      //     if(this.videoDetails.t_title != "")
      //       this.videoDetails.title = this.videoDetails.t_title;
      //     if(this.videoDetails.t_desc !="")
      //       this.videoDetails.description = this.videoDetails.t_desc;
      //   }
      // })
      this.channelService.getDetailsOf(this.videoDetails.channelId).then(channelDetails => {
        this.numOfChannelFollowers = channelDetails.followers;
      });

      return this.storage.get(USER_DATA_KEY);
    }).then(userData => {
      this.isLoggedIn = userData !== null;
      if (this.isLoggedIn) {
        this.userImageUrl = `https://api.the-v.net/site/v2.0/picture?id=${userData.id}`;

        // check if the video has been added to the playlist by the user
        this.playlistService.isVideoAddedToPlaylist(userData.id,this.videoId).then(isAdded => {
          this.isVideoAddedToPlaylist = isAdded;
        }).catch(e => {
          console.log(e);
        });
        // check if the video has been downloaded by the user
        this.videoService.isDownloaded(this.videoId, userData.id).then(isDownloaded => {
          this.isVideoDownloaded = isDownloaded;

          let obs = this.videoService.getInProgressDownload(this.videoId);
          if (obs) {
            this.observeInProgressDownload(this.videoId, obs);
          }
        }).catch(e => {
          console.log(e);
        });
        this.channelService.isFollowing(this.videoDetails.channelId).then(isFollowing => {
          this.isFollowing = isFollowing;
        }).catch(e => {
          console.log(e);
        });
        this.videoService.hasBeenNotified(this.videoDetails.channelId.toString(), userData.id)
        .then(n=>{
          this.hasNotified = n;
          if(!n){
            this.showTooltip = true;
            setTimeout(()=>{this.showTooltip = false}, 3000);
          }
        })
        .catch(e=>{
          console.log(e);
        });

        let hasBeenLikedPromise = this.videoService.hasBeenLiked(this.videoId, userData.id).then(hasBeenLiked => {
          // FIXME: check if the video has been liked by the user
          // FIXME: requires a new API call
          this.hasBeenLiked = hasBeenLiked;
        }).catch(e => {
          console.log(e);
        });
      }
    });

    // load 5 initial related videos
    let relatedVideosPromise = this.videoService.getRelatedVideos(this.videoId).then(relatedVideos => {
      this.relatedVideoDetails = [];
      this.relatedVideoDetails = relatedVideos;
    });
    // load video's comments
    let commentsPromise = this.videoService.getComments(this.videoId).then(comments => {
      this.videoComments = comments;
    });

    Promise.all([detailsPromise, commentsPromise, relatedVideosPromise]).then(_ => {
      this.isLoading = false;
      loading.dismiss();
      if (this.content) {
        console.log(this.content);
        this.content.scrollTop();
      }
    })
  }

  followChannel() {
        this.channelService.follow(this.videoDetails.channelId).then(isSuccessful => {
          if (!isSuccessful)
            return;

          this.channelService.isFollowing(this.videoDetails.channelId).then(isFollowing => {
            this.isFollowing = isFollowing;
          });
        });
     
  }

  unfollowChannel() {
    
        this.channelService.unfollow(this.videoDetails.channelId).then(isSuccessful => {
          if (!isSuccessful)
            return;

          this.channelService.isFollowing(this.videoDetails.channelId).then(isFollowing => {
            this.isFollowing = isFollowing;
          });
        });
     
  }

  viewPlaylist() {
    this.isDisplayingPlaylist = !this.isDisplayingPlaylist;
  }

  playNextVideo() {
    if (this.hasNextVideoInPlaylist())
      this.goToVideo(this.playlistVideoIds[++this.playlistIndex].bcid, true);
  }

  playPrevVideo() {
    if (this.hasPreviousVideoInPlaylist())
      this.goToVideo(this.playlistVideoIds[--this.playlistIndex].bcid, true);
  }

  playVideoInPlaylist(index: number) {
    if (this.playlistIndex === index)
      return;

    this.playlistIndex = index;
    this.goToVideo(this.playlistVideoIds[index].bcid, true);
  }

  private getPlaylistAndPlayFirstVideo() {
    let loading = this.loadingCtrl.create({
			spinner:'crescent',
			cssClass: 'my-loading-class'
		});
    loading.present();
    this.storage.get(USER_DATA_KEY).then(userdata => {
      return this.playlistService.getPlaylistOf(userdata.id);
    }).then(playlistEntries => {
      this.playlistVideoIds = playlistEntries;
      this.goToVideo(playlistEntries[this.playlistIndex].bcid, true, loading);
    });
  }

  private hasNextVideoInPlaylist() {
    return this.playlistIndex < (this.playlistVideoIds.length - 1);
  }

  private hasPreviousVideoInPlaylist() {
    return this.playlistIndex > 0;
  }

  private observeInProgressDownload(id: string, observable: Observable<number>) {
    this.isStarting = false;
    this.isVideoDownloading = true;
    this.downloadProgress = 0;

    this.downloadProgressSubscription = observable.subscribe(progress => {
      this.downloadProgress = progress;
      this.ref.detectChanges();
    }, e => {
      this.isVideoDownloading = false;

      this.downloadService.showDownloadErrorFinishAlertFor(this.videoDetails.bcid);
    }, () => {
      this.isVideoDownloading = false;
      this.isVideoDownloaded = true;

      this.downloadService.showDownloadFinishAlertFor(this.videoDetails.bcid);
    });
  }

  private isOrientationPortrait(type: string): boolean {
    switch (type) {
      case 'portrait':
      case 'portrait-primary':
      case 'portrait-secondary':
        return true;
      case 'landscape':
      case 'landscape-primary':
      case 'landscape-secondary':
        return false;
    }
  }

  private showAlertVideoAddedToPlaylist() {
    let alert = this.alertController.create({
      title: 'Added to Playlist',
      message: 'The video has been successfully added to your playlist!',
      buttons: [{
        text: 'OK', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }

  private showAlertVideoNotAddedToPlaylist() {
    let alert = this.alertController.create({
      title: 'Failed to Add to Playlist',
      message: 'The video was not successfully added to your playlist.',
      buttons: [{
        text: 'OK', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }

  private showAlertVideoAlreadyInPlaylist() {
    let alert = this.alertController.create({
      title: 'Oops!',
      message: 'This video has already been added to your playlist!',
      buttons: [{
        text: 'OK', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }

  private showAlertVideoHasAlreadyBeenDownloaded() {
    let alert = this.alertController.create({
      title: 'Oops!',
      message: 'This video has already been downloaded!',
      buttons: [{
        text: 'OK', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }
  private showAlertVideoCannotBeDownloaded() {
    let alert = this.alertController.create({
      title: 'Oops!',
      message: 'This video cannot be downloaded!',
      buttons: [{
        text: 'OK', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }

  private showErrorAlertOnVideoLike() {
    let alert = this.alertController.create({
      title: 'Oh no!',
      message: 'An error occurred while trying to add your like to the video. Please try again',
      buttons: [{
        text: 'Ok', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }

  private showErrorAlertOnVideoDownload() {
    let alert = this.alertController.create({
      title: 'Oops!',
      message: 'An error occurred while trying to download the video. Please try again.',
      buttons: [{
        text: 'OK', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }

  private showErrorAlertOnVideoPlaylist() {
    let alert = this.alertController.create({
      title: 'Oops!',
      message: 'An error occurred while trying to add the video to your playlist. Please try again.',
      buttons: [{
        text: 'OK', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }

  private showErrorAlertOnVideoComment() {
    let alert = this.alertController.create({
      title: 'Oh no!',
      message: 'Your comment was not successfully posted. Please try again',
      buttons: [{
        text: 'Ok', handler: () => {
          alert.dismiss();
          return true;
        }
      }]
    });
    alert.present();
  }
}
