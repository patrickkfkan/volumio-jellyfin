# Jellyfin plugin for Volumio

Volumio plugin for playing audio from one or more [Jellyfin](https://jellyfin.org/) servers. It has been tested on Volumio 2.834 + Jellyfin 10.6.4.

#### Getting Started

To install the Jellyfin plugin, first make sure you have [enabled SSH access](https://volumio.github.io/docs/User_Manual/SSH.html) on your Volumio device. Then, in a terminal:

```
$ ssh volumio@<your_Volumio_address>

volumio:~$ mkdir jellyfin-plugin
volumio:~$ cd jellyfin-plugin
volumio:~/jellyfin-plugin$ git clone https://github.com/patrickkfkan/volumio-jellyfin.git
volumio:~/jellyfin-plugin$ cd volumio-jellyfin
volumio:~/jellyfin-plugin/volumio-jellyfin$ volumio plugin install

...
Progress: 100
Status :Jellyfin Successfully Installed, Do you want to enable the plugin now?
...

// If the process appears to hang at this point, just press Ctrl-C to return to the terminal.
```

Now access Volumio in a web browser. Go to ``Plugins -> Installed plugins`` and enable the Jellyfin plugin by activating the switch next to it.

#### Updating

When a new version of the plugin becomes available, you can ssh into your Volumio device and update as follows (assuming you have not deleted the directory which you cloned from this repo):

```
volumio:~$ cd ~/jellyfin-plugin/volumio-jellyfin/
volumio:~/jellyfin-plugin/volumio-jellyfin$ git pull
...
volumio:~/jellyfin-plugin/volumio-jellyfin$ volumio plugin update

This command will update the plugin on your device
...
Progress: 100
Status :Successfully updated plugin

// If the process appears to hang at this point, just press Ctrl-C to return to the terminal.

volumio:~/jellyfin-plugin/volumio-jellyfin$ sudo systemctl restart volumio
```

#### Adding a Jellyfin Server

With the plugin activated, the next thing you would want to do is add a Jellyfin server. The server can be on the same network as your Volumio device, or it can be remote (of course, you would have to configure the server so that it is accessible from the Internet). You can add a server in the ```Add a Server``` section of the plugin settings.


*Make sure you provide the full server address. "http://www.myjellyfinserver.com:8096" would be a valid example, but leaving out the "http://" will render it invalid.*

You can add multiple servers, and those that are reachable will appear when you click ```Jellyfin``` in the left menu. Choose a server to login and start browsing your music collections. Enjoy!

#### Notes

- Audio is served through Direct Streaming. This means when you play a song, it will be streamed to Volumio in its original format without any modifications. This gives you the highest sound quality possible but, if you are streaming from a remote server, then you should consider whether you have a fast-enough Internet connection with unlimited data.
- If the URI of an audio stream contains the letters 'bbc', Volumio will fail to update the stream's playback status and the queue will stop after playing the current stream. This is because the MPD plugin that is supplied with Volumio, and which the Jellyfin plugin utilizes, assumes URIs containing 'bbc' has got to be BBC webradio streams and tries to parse the stream's information in a particular way that would cause it to fail with the Jellyfin streams. ~~A workaround may be possible but not provided since this behavior is caused by a reckless assumption that should be fixed within the MPD plugin.~~ Until Volumio pushes a fix, you can run a script provided by the Jellyfin plugin to resolve this. To run the script, SSH into Volumio and then:

```
volumio:~$ /data/plugins/music_service/jellyfin/scripts/fix_mpd_bbc
```
Enter 'y' when prompted for confirmation:
```
This script will modify /volumio/app/plugins/music_service/mpd/index.js as follows:

Search:
if (objTrackInfo.file.indexOf('bbc') >= 0) {

Replace with:
if (objTrackInfo.file.indexOf('bbc') >= 0 && objTrackInfo.Name) {

Proceed [Y/n]? y

Operation completed.

You need to restart Volumio for changes to be applied. Would you like to do that now [Y/n]? y

Volumio restarted
```

#### Changelog

0.1.3-a:
- [Added] Collections support
- [Fixed] Wrong selections showing in filter views
- [Changed] Minor UI changes

0.1.2-a:
- [Added] 'Random' sort option in All Songs
- [Changed] Apply filters when playing top-level folders (e.g. clicking Play button on 'Albums' and 'All Songs')
- [Fixed] Next Page URIs exploded, resulting in extra songs added to queue
- [Changed]: Use semantic versioning from now on

0.1.1b-20210905:
- [Added] Filters
- [Changed] Miscellaneous UI changes

0.1.0b-20201222:
- [Fixed] Volumio playlist items added from queue cannot be played

0.1.0b
- Initial release
