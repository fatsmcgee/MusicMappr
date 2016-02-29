MusicMappr
==========

## Live demo here! http://fatsmcgee.github.io/MusicMappr/

<b>What does it do?</b>

MusicMappr finds chunks of songs that are similar, and clusters them accordingly. You can visualize these clusters and play them back at will. This is for music lovers who are curious about the structures inherent to their favorite songs.

<b>How does it work?</b>

MusicMappr uses a hodge-podge of HTML5 features as well as some clustering and visualization techniques from machine learning. Using the WebAudio API, it extracts raw samples from a song. Then, it divides those samples into chunks and performs a fourier transform on each chunk to extract frequency data (dividing the work into multiple WebWorkers to speed up the process). Then, MusicMappr uses the T-SNE algorithm to visualize differences between the high dimensional fourier features in 2-d space. Finally, it runs K-means clustering to show the clusters that arise from T-SNE. More info is in our [NIME paper](http://www.nime.org/proceedings/2015/nime2015_161.pdf) and [YouTube demo](https://www.youtube.com/watch?v=mvD6e1uiO8k).

<b>How do I get it to work?</b>

MusicMappr is a work in progress. Right now it is confirmed to work on Chrome and Firefox, but no other browsers. Make sure you have the latest version of one of these browsers.

<b>Where can I try it?</b>
Go to http://fatsmcgee.github.io/MusicMappr/ for a live demo! Not guaranteed to be the latest version.

# New features! 
Hit us up if you're interested, or just submit pull requests!
* Recording audio using the WebAudio API. It would be dope to record audio straight into MusicMappr and then see the samples for it!
* Beat detection (http://tech.beatport.com/2014/web-audio/beat-detection-using-web-audio/). Right now we just chop up a song according to the sampling frequency.
* Mobile support. Making an app out of this would be awesome!
* Prettyfying the UI. Going all Material Design on this shit!

### Citing this work
E. Benjamin, and J. Altosaar. MusicMapper: Interactive 2D representations of music samples for in-browser remixing and exploration. _15th International Conference on New Interfaces for Musical Expression._ (2015). [PDF](http://www.nime.org/proceedings/2015/nime2015_161.pdf).
