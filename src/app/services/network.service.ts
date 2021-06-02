import { Injectable } from '@angular/core';
import { Network } from "@ionic-native/network";
import { ToastController, Toast } from "ionic-angular";
import { Subscription, TeardownLogic } from "rxjs/Subscription";

@Injectable()
export class ConnectionService {
    connectSubscription: Subscription;
    disconnectSubscription: any;
    private activeToast: Toast;

    constructor(private toastCtrl: ToastController, private network: Network) {
    }

    subscribeOnDisconnect(callback: () => void): TeardownLogic {
        return this.network.onDisconnect().subscribe(callback);
    }

    subscribeOnConnect(callback: () => void): TeardownLogic {
        return this.network.onConnect().subscribe(callback);
    }

    setActiveToast(toast){
        this.activeToast = toast;
    }

    checkNetworkConnection(callback?: () => void) {
        this.disconnectSubscription = this.network.onDisconnect().subscribe(() => {
            let toast = this.toastCtrl.create({
                message: "You're Offline. Check your internet connection.",
                position: 'bottom'
            });
            toast.present().then(() => {
                if (this.activeToast)
                    this.activeToast.dismiss();
                this.activeToast = toast;
            });
        });

        this.connectSubscription = this.network.onConnect().subscribe(() => {
            let toast = this.toastCtrl.create({
                message: 'Device is connected!',
                position: 'bottom',
                duration: 3000
            });

            toast.present().then(() => {
                if (this.activeToast)
                    this.activeToast.dismiss();
                this.activeToast = toast;
            });
        });
    }
}
