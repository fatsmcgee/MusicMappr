importScripts('complex_array.js','fft.js','feature_extractor.js');   

function melFromHertz(hz){
				return 1127*Math.log(1+hz/700);
}
			
function hertzFromMel(mel){
	return 700*(Math.exp(mel/1127) - 1);
}

function getFeaturesFromFrequencyMagnitudes(freqMagnitudes,chunkDuration){

	//don't use anything less than 100hz or more than 10000hz
	var lowFrequencyBar = 100*chunkDuration;
	var highFrequencyBar = 10000*chunkDuration;
	
	for(var i = 0; i<lowFrequencyBar; i++){
		freqMagnitudes[i] = 0;
	}
	for(var i = highFrequencyBar; i<freqMagnitudes.length; i++){
		freqMagnitudes[i] = 0;
	}
	
	//will contain 100 buckets of size 32 each, going up to mel 3200, which is around 10,000 hz
	var melHistogram = [];
	var freqIdx = 0;
	
	for(var mel = 32; mel <= 3200; mel+=32){
		var frequency = hertzFromMel(mel);
		var melBucket = 0;
		while(freqIdx*chunkDuration < frequency){
			melBucket += freqMagnitudes[freqIdx];
			freqIdx++;
		}
		
		if(isNaN(melBucket)){
			melBucket = 0;
		}
		melHistogram.push(melBucket);
	}

	return melHistogram;
}

			
function getMagnitudesFromComplexArray(cArray){
				var n = cArray.real.length/2 + 1;
				var data = new Float32Array(n);
				for(var i = 0; i<n; i++){
					var real = cArray.real[i];
					var imag = cArray.imag[i];
					data[i] = real*real + imag*imag;
				}
				
				return data;
}
			
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