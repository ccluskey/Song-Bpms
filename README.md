# Description
Spotify Song BPMs can display information about a user's Spotify playlists that is not available in the Spotify app. Currently, song BPM and song time signature. Any information available in the [Spotify API](https://developer.spotify.com/console/tracks/) can be easily added as well.

The information is displayed in a table and is sortable and searchable.
![Screenshot of the website](https://i.imgur.com/xQQ0nio.png)

# Setup
1. In `spotify_api_controller.js` you will need to add your own CLIENT_ID and CLIENT_SECRET.  These can be created [here](https://developer.spotify.com/dashboard/applications).  You will need a Spotify developer account and must create a new app.
2. In your spotify app you need at add `http://localhost:8000/song_bpms.html` under Edit Settings -> Redirect URIs
3. I use [python3](https://www.python.org/downloads/) to start the webserver:
```
python -m http.server
```
4. Visit http://localhost:8000/login.html to login to Spotify and fetch your own playlists