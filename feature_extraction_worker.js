importScripts('complex_array.js','fft.js','feature_extractor.js');   

			
/*
Expects input of form:
{
	samples: (real array of samples),
	chunkNo: (chunk number)
	chunkDuration: (chunk duration in seconds)
}
*/

/*Returns output of form:
{
	features: real array
	chunkNo: (chunk number)
}
*/
onmessage = function (event) {
  var input = event.data;
  
  var samples = input.samples;
  
  var output = {features:feature_extractor.getFeatures(samples,input.chunkDuration), chunkNo:input.chunkNo};
  postMessage(output);
};