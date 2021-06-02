import { Component } from '@angular/core';
import { NavController, PopoverController } from 'ionic-angular';
import { PlaylistService } from "../../app/services/playlist.service";
import { Storage } from "@ionic/storage";
import { USER_DATA_KEY } from "../../app/app.constants";
import { VideoService } from "../../app/services/video.service";
import { VideoDetails } from "../../app/models/video.models";
import { PlaylistPopoverPage } from "../../app/popover";
import { DownloadEntry } from "../../app/models/download.models";
import { NowPlayingPage } from "../now-playing/now-playing";
import { GoogleAnalyticsService } from '../../app/services/analytics.service';
import { PlaylistEntry } from '../../app/models/playlist.models';

@Component({
  selector: 'page-playlist',
  templateUrl: 'playlist.html',
})
export class PlaylistPage {

  private playlistVideos: PlaylistEntry[] = [];

  constructor(
    private navCtrl: NavController,
    private storage: Storage,
    private playlistService: PlaylistService,
    private popoverCtrl: PopoverController,
    private gaSvc:GoogleAnalyticsService
  ) { }

  ionViewDidEnter() {
    this.refreshPlaylist();
    this.gaSvc.gaTrackPageEnter('Playlist');
  }

  showPopover(event: any, videoDetail: VideoDetails) {
    let popover = this.popoverCtrl.create(PlaylistPopoverPage, {
      videoDetails: videoDetail,
      refreshPlaylistCallback: () => {
        this.refreshPlaylist();
      }
    });
    popover.present({ ev: event });
  }

  playVideo(entry: DownloadEntry) {
    this.navCtrl.push(NowPlayingPage, {
      id: entry.bcid,
      playAll: false
    });
  }

  playAll() {
    if (this.playlistVideos.length > 0) {
      this.navCtrl.push(NowPlayingPage, {
        id: null,
        playAll: true
      });
    }
  }

  refreshPlaylist() {
    this.storage.get(USER_DATA_KEY).then(userData => {
      if (userData) {
        return this.playlistService.getPlaylistOf(userData.id);
      } else {
        throw new Error('user_not_logged_in');
      }
    }).then(videoDetails => {
      this.playlistVideos = videoDetails;
    }).catch(e => {
      console.error(JSON.stringify(e));
    });
  }
}