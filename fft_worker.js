importScripts('complex_array.js','fft.js');   

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
	fftInput: (real array),
	chunkNo: (chunk number)
}
*/

/*
var worker = new Worker('fft_worker.js');
var real = [1,1,1,1];
worker.onmessage = function(evt){window.blah = evt.data;console.log('hi'); console.log(evt);}
worker.postMessage({chunkNo:1,fftInput:real});
*/

/*Returns output of form:
{
	magnitudes: (complex array),
	chunkNo: (chunk number)
}
*/
onmessage = function (event) {
  var input = event.data;
  
  var realValues = input.fftInput;
  
  var samples = new complex_array.ComplexArray(realValues.length);
  for(var i = 0; i<realValues.length; i++){
	samples.real[i] = realValues[i];
	samples.imag[i] = 0;
  }
  
  //console.log("sample:" + samples.real[0]);
  var fft = samples.FFT();
  //console.log("fft:" + fft.real[0]);
  var fftMagnitudes =  getMagnitudesFromComplexArray(fft);
  //console.log("mag: " + fftMagnitudes[0]);
  var output = {magnitudes:fftMagnitudes, chunkNo:input.chunkNo};
  postMessage(output);
};