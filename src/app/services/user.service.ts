import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import { Storage } from '@ionic/storage';
import { IS_LOGGED_IN_KEY, USER_AUTH_REFRESH_KEY, USER_DATA_AUTH_KEY, USER_DATA_KEY } from '../app.constants';
import { UserDetail } from '../models/user.models';
import { HTTP } from '@ionic-native/http';

interface Auth {
	ver: number,
	auth_time: number,
	token_type: string,
	access_token: string,
	aud: string,
	lang: string
}

@Injectable()
export class UserService {
	private API_URL = 'https://api.the-v.net';

	constructor(private http: HTTP, private storage: Storage) { }

	private getAuth(loginForm: { email: string; password: string }) {
		let body = {
			username: loginForm.email,
			password: loginForm.password,
			audience: 'ats', //to change
			issuer: 'aresh' //to change
		};

		let headers = { 'Content-Type': 'application/json' };
		this.http.setDataSerializer('json');
		return this.http
			.post(this.API_URL + '/User/authenticate', body, headers)
			.then(
				res => {
					let r = JSON.parse(res.data);
					if (r.memtype == "Free") {
						throw new Error('FREEUSER');
					}
					return this.storage
						.set(USER_AUTH_REFRESH_KEY, loginForm)
						.then(() => {
							return this.storage.set(USER_DATA_AUTH_KEY, r);
						})
						.then(() => {
							return r;
						});
				},
				(error) => {
					console.log(error.error);
					let err= JSON.parse(error.error);
					if (err.message == 'Invalid Parameters') {
						throw new Error('UNAUTHORIZED');
					} else {
						throw new Error('ERROR');
					}
				}
			);
	}

	refreshAuth() {
		return this.storage
			.get(USER_AUTH_REFRESH_KEY)
			.then((cred) => {
				return this.getAuth(cred);
			})
			.then(() => {
				return true;
			})
			.catch((e) => {
				return false;
			});
	}

	login(loginForm: { email: string; password: string }) {
		return this.getAuth(loginForm)
			.then(auth => {
				
				
					return this.storage.set(IS_LOGGED_IN_KEY, true).then(() => {
						let head = {
							'Content-Type': 'application/json',
							'Authorization': `${auth.token_type} ${auth.access_token}`
						};
						return this.http
							.get(this.API_URL + `/User/data/${auth.aud}`, {}, head)
							.then(resp => {
								let r = JSON.parse(resp.data);
								return this.storage.set(USER_DATA_KEY, r[0]).then(() => {
									return true;
								});
							});
					});
				
			})
			.catch((e) => {
				throw e;
			});
	}

	logout() {
		return this.storage
			.set(IS_LOGGED_IN_KEY, false)
			.then(() => {
				return this.storage.set(USER_DATA_KEY, null);
			})
			.then(() => {
				return this.storage.set(USER_DATA_AUTH_KEY, null);
			})
			.then(() => {
				return this.storage.set(USER_AUTH_REFRESH_KEY, null);
			})
			.then(() => {
				return true;
			})
			.catch((e) => {
				return false;
			});
	}

	forgotPassword(email: string) {
		//this.http.
		let body = {
			'email': email
		}
		//body.set('action', 'forgotpassword_site');


		let headers = { 'Content-Type': 'application/x-www-form-urlencoded' }



		return this.http.post(this.API_URL + '/log/forgotpassword', body, headers)
			.then(response => {
				console.log(response);
				let r = response.data;
				console.log(r.indexOf("Forgot Password Sent to your Email"));
				if (r.indexOf("Forgot Password Sent to your Email") > 0) {
					return true;
				}
				else
					return false;
			},
				e => {
					throw new Error("Error! Something went wrong! Please try again.");
				});
	}

	// getUserDetails(id: string) {
	// 	//TODO: Change to get from storage USER_DATA_KEY
	// 	let headers = new Headers();
	// 	headers.set('Content-Type', 'application/x-www-form-urlencoded');

	// 	return this.http
	// 		.post(
	// 			'https://cums.the-v.net/site.aspx',
	// 			encodeObject({
	// 				action: 'DDrupal_User_GetLoggedInUserData',
	// 				id: id
	// 			}),
	// 			{ headers: headers }
	// 		)
	// 		.map((response) => {
	// 			let userDetails = <UserDetail[]>response.json();
	// 			if (userDetails.length > 0) {
	// 				return userDetails[0];
	// 			} else {
	// 				return false;
	// 			}
	// 		})
	// 		.toPromise();
	// }
}
