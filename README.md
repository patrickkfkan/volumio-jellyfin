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

With the plugin activated, the next thing you would want to do is add a Jellyfin server. The server can be on the same network as your Volumio device, or it can be remote (of course, you would have to configure the server so that it is accessible from the Internet). You can add a server in the ```Add a Server``` section of the plugin settings.


*Make sure you provide the full server address. "http://www.myjellyfinserver.com:8096" would be a valid example, but leaving out the "http://" will render it invalid.*

You can add multiple servers, and those that are reachable will appear when you click ```Jellyfin``` in the left menu. Choose a server to login and start browsing your music collections. Enjoy!

#### Notes

- Audio is served through Direct Streaming. This means when you play a song, it will be streamed to Volumio in its original format without any modifications. This gives you the highest sound quality possible but, if you are streaming from a remote server, then you should consider whether you have a fast Internet connection with unlimited data.
- If the URI of an audio stream contains the letters 'bbc', Volumio will fail to update the stream's playback status and the queue will stop after playing the current stream. This is because the MPD plugin that is supplied with Volumio, and which the Jellyfin plugin utilizes, assumes URIs containing 'bbc' has got to be BBC webradio streams and tries to parse the stream's information in a particular way that would cause it to fail with the Jellyfin streams. A workaround may be possible but not provided since this behavior is caused by a reckless assumption that should be fixed within the MPD plugin.
