import { Component, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController, ViewController, AlertController } from 'ionic-angular';
import { DownloadService } from "../../app/services/download.service";
import { Storage } from '@ionic/storage';
import { USER_DATA_KEY } from "../../app/app.constants";
import { DownloadEntry } from "../../app/models/download.models";
import { PlayDownloadedVideoPage } from "../play-downloaded-video/play-downloaded-video";
import { GoogleAnalyticsService } from '../../app/services/analytics.service';

@Component({
  selector: 'page-downloads',
  templateUrl: 'downloads.html',
})
export class DownloadsPage {

  private downloadedVideos: DownloadEntry[] = [];

  constructor(
    private storage: Storage,
    private alertCtrl: AlertController,
    private downloadService: DownloadService,
    private navCtrl: NavController,
    private ref: ChangeDetectorRef,
    private gaSvc:GoogleAnalyticsService
  ) { 
    this.gaSvc.gaTrackPageEnter('Downloads');
  }

  ionViewDidEnter() {
    this.storage.get(USER_DATA_KEY).then(userData => {
      if (userData) {
        return this.downloadService.removeAllExpiredVideosFor(userData.id).then(()=>{
          return this.downloadService.getDownloadedVideosOf(userData.id);
        })
      } else {
        throw new Error('user_not_logged_in');
      }
    }).then(downloadedVideos => {
      this.downloadedVideos = downloadedVideos;

      let inProgressDownloads = this.downloadService.getAllInProgressDownloads();
      this.downloadedVideos.forEach(de => {
        let ipdl = inProgressDownloads[de.bcid];
        de.isInProgress = ipdl != null && ipdl.observable != null;
        if (de.isInProgress) {
          de.progress = {
            progress: 0,
            hasErrors: false,
            isDownloading: true,
            subscription: null
          };
          de.progress.subscription = ipdl.observable.subscribe(progress => {
            de.progress.progress = progress;
            this.ref.detectChanges();
          }, e => {
            de.progress.isDownloading = false;
            de.progress.hasErrors = true;
            de.isInProgress = false;
          }, () => {
            de.progress.isDownloading = false;
            de.progress.hasErrors = false;
            de.isInProgress = false;
          });
        }
      });
    });
  }

  playVideo(entry: DownloadEntry) {
    if (entry.isInProgress) {
      return;
    }

    this.navCtrl.push(PlayDownloadedVideoPage, {
      id: entry.bcid
    });
  }

  deleteEntry(entry: DownloadEntry) {
    if (entry.isInProgress) {
      return;
    }

    let confirm = this.alertCtrl.create({
      title: 'Delete video?',
      message: `Are you sure you want to remove the downloaded copy of '${entry.title}'?`,

      buttons: [
        {
          text: 'Yes',
          handler: () => {
            this.storage.get(USER_DATA_KEY).then(userData => {
              return this.downloadService.removeVideoFor(userData.id, entry.bcid)
                .then(isSuccessful => {
                  return {
                    isSuccessful: isSuccessful,
                    userId: userData.id
                  }
                })
            }).then(data => {
              let title = '';
              let message = '';
        
              if (data.isSuccessful) {
                title = 'Downloaded video removed!';
                message = 'The downloaded video was successfully removed.';
              } else {
                title = 'Oh no!';
                message = 'The downloaded video you wanted to delete was not successfully removed.';
              }
        
              let alert = this.alertCtrl.create({
                title: title,
                message: message,
                buttons: [{
                  text: 'Ok',
                  handler: () => {
                    alert.dismiss();
                    return true;
                  }
                }]
              })
              alert.present();
        
              return this.downloadService.getDownloadedVideosOf(data.userId);
            }).then(downloadedVideos => {
              this.downloadedVideos = downloadedVideos;
            });
            confirm.dismiss();
            return true;
          }
        }, {
          text: 'No',
          handler: () => {
            confirm.dismiss();
            return true;
          }
        }
      ]
    })
    confirm.present();
  }
}
