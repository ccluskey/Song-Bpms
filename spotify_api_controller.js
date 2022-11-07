var CLIENT_ID = "[YOUR_CLIENT_ID]";
var CLIENT_SECRET = "[YOUR_CLIENT_SECRET]"
var REDIRECT_URI = "http%3A%2F%2Flocalhost%3A8000%2Fsong_bpms.html";
var AUTH_TOKEN_COOKIE = "spotify_bpms_auth_token"

// code should be included in the URL parameters if we were properly loged in from the login page
function getAuthToken(callback) {
	// First check if we already have a valid token in local storage
	var token_from_storage = getWithExpiry(AUTH_TOKEN_COOKIE);
	if (token_from_storage != null) {
		callback(token_from_storage);
		return;
    }
	
	// Else call Spotify API to get the token
	let params = (new URL(document.location)).searchParams;
	if (params.get("code") != null) {
		var access_request = new XMLHttpRequest();
		access_request.open('POST', 'https://accounts.spotify.com/api/token?code=' + params.get("code") + '&grant_type=authorization_code&redirect_uri=' + REDIRECT_URI, true);
		access_request.setRequestHeader('Authorization', 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET));
		access_request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		access_request.onreadystatechange= function () {
			if (this.readyState == 4 && this.status == 200) {
				var response = JSON.parse(this.responseText);
				if (response != null && response.access_token) {
					// Set the token in local storeage.  Multiply by 1000 because spotify returns expiry time in seconds
					setWithExpiry(AUTH_TOKEN_COOKIE, response.access_token, response.expires_in * 1000)
					callback(response.access_token);
				}
			}
		}
		access_request.send();
	}
}

// Gets a list of users playlists and id
function getUsersPlaylists(authToken, callback) {
	getUsersPlaylistsWithOffset(authToken, 'https://api.spotify.com/v1/me/playlists?limit=50', callback);
}

// Helper function to fetch the rest of a users playlists.  Spotify will only return max 50 playlists per request
function getUsersPlaylistsWithOffset(authToken, url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
	xhr.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(this.responseText)
			if (response.next != null) {
				getUsersPlaylistsWithOffset(authToken, response.next, callback);
			}

			var playlist_ids = []
			for (var i = 0; i < response.items.length; i++) {
				playlist_ids.push({
					name : response.items[i].name,
					id   : response.items[i].id
				});
			}
			callback(playlist_ids);
		}
	}
	// send the request for playlists
	xhr.send();
}


// Gets title, artist, bpm, time signature and spotify link, for all songs in the given playlistId
function getPlaylistItems(authToken, playlistId, callback) {
	getPlaylistItemsWithOffset(authToken, "https://api.spotify.com/v1/playlists/" + playlistId + "/tracks", callback);
}

// Helper function that takes the URL to fetch the playlist items instead of playlistId.
// Useful because spotify returns a url for the next request when there are more than 100 items in a playlist
function getPlaylistItemsWithOffset(authToken, playlistUrl, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", playlistUrl, true);
	xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
	xhr.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(this.responseText)
			var items = response.items;
			
			// get the next 100 songs
			if (response.next != null) {
				getPlaylistItemsWithOffset(authToken, response.next, callback);
			}
			
			var extras_xhr = new XMLHttpRequest();
			var tracks = "";
			var i = 0;
			while (i < items.length) {
				tracks += items[i].track.id + ",";
				i++;
			}
			var url = 'https://api.spotify.com/v1/audio-features?ids=' + tracks;
			extras_xhr.open("GET", url, true);
			extras_xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
			extras_xhr.items = items

			extras_xhr.onreadystatechange = function () {
				var x, items;
				x = this;
				items = x.items;
				if (this.readyState == 4 && this.status == 200) {
					var extras_response = JSON.parse(this.responseText).audio_features;
					var song_data = [];
					var j = 0;
					while (j < extras_response.length) {
						song_data.push({
							title  : items[j].track.name,
							artist : items[j].track.artists[0].name,
							bpm    : extras_response[j] ? Math.round(extras_response[j].tempo) : "-",
							time   : extras_response[j] ? extras_response[j].time_signature + "/4" : "-",
							link   : items[j].track.external_urls.spotify
						});
						j++;
					}
					callback(song_data);
				}
			}
			// request for bpms and time signature
			extras_xhr.send()
		}
	}
	// request for playlist items
	xhr.send();
}

// Get item from local storeage if it's not expired
function getWithExpiry(key) {
	const itemStr = window.localStorage.getItem(key)
	// if the item doesn't exist, return null
	if (!itemStr) {
		return null
	}
	const item = JSON.parse(itemStr)
	const now = new Date()
	// compare the expiry time of the item with the current time
	if (now.getTime() > item.expiry) {
		// If the item is expired, delete the item from storage
		// and return null
		window.localStorage.removeItem(key)
		return null
	}
	return item.value
}

// Set item in local storeage with expiration
function setWithExpiry(key, value, expires_in) {
	const now = new Date()

	// `item` is an object which contains the original value
	// as well as the time when it's supposed to expire
	const item = {
		value: value,
		expiry: now.getTime() + expires_in,
	}
	window.localStorage.setItem(key, JSON.stringify(item))
}