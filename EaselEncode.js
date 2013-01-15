/**
 * Graphics.encodePath, as the mirror to .decodePath
 * Goes through only the path Commands, and returns a compressed base64 data string
 *
 * @author Nicklaus Liow, nutcasenightmare.com
 **/

// namespace:
this.createjs = this.createjs||{};

(function(){

/**
 * The reverse of decodePath();
 * Goes through only the path Commands, and returns a compressed base64 data string
 * This way, you don't have to call the same drawing instructions on an EncodePath.
 **/

createjs.Graphics.prototype.encode = function(){

	// Input & Output
	this._updateInstructions();
	var instr, instrs=this._instructions, instructions=[];

	// For each instruction past the "beginPath" function
	// Compress them as much as you can

	for (var i=1; i<instrs.length; i++) {

		var instr = instrs[i];

		//////////
		// PATH: Compress with EncodePath

		if(instr.path){

			var ep = new EncodePath();

			while((instr=instrs[i++]).path){

				// Which path function was it?
				var pathFunctions = ["moveTo","lineTo","quadraticCurveTo","bezierCurveTo"];
				for(var j=0; j<pathFunctions.length; j++){
					var instrName = pathFunctions[j];
					if(instr.f==this._ctx[instrName]){
						ep[instrName].apply(ep,instr.params);
					}
				}

			}

			instructions.push({ fn:"p", params:[ep.code] });

		}

		//////////
		// SET PROP

		if(instr.f==this._setProp){
			switch(instr.params[0]){

				// It's Set Stroke Style
				case "lineWidth":
					instructions.push({ 
						fn:"ss", params:[
							instr.params[1],
							(instr=instrs[++i]).params[1],
							(instr=instrs[++i]).params[1],
							(instr=instrs[++i]).params[1]
						]
					});
					break;

				// It's Begin Stroke
				case "strokeStyle":
					instructions.push({
						fn:"s", params:[ instr.params[1] ]
					});
					break;

			}
		}

	}

	return instructions;

};

createjs.Graphics.prototype.decode = function(instructions){
	for(var i=0; i<instructions.length; i++) {
		var instr = instructions[i];
		var fn = this[instr.fn];
		var params = instr.params;
		fn.apply(this,params);
	}
};

/**
* The reverse of the EaselJS Graphics.decode method for
* compactly encoding paths.
* 
* @author Brett Johnson, periscopic.com
*
* @example
* var ep = new EncodePath();
* ep.moveTo(-150, 0).lineTo(150, 0);
* var shp = new Shape();
* shp.graphics.decode(ep.code); //draws line from -150,0 to 150,0
**/
 
var EncodePath = (function(){
	
	var MAX_CHAR2 = 204.7;
	var BASE_64 = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9','+','/'];
 
	function encodeMethod(methodInt, numChars) {
		return BASE_64[(methodInt<<3) | ((numChars===3?1:0)<<2)];
	}
	
	function encodeNum2(num) {
		var val = Math.round(Math.abs(num)*10) | ((num>=0?0:1)<<11);
		return BASE_64[val>>6] + BASE_64[val & 63];
	}
	
	function encodeNum3(num) {
		var val = Math.round(Math.abs(num)*10) | ((num>=0?0:1)<<17);
		return BASE_64[(val>>12)&63] + BASE_64[(val>>6)&63] + BASE_64[val & 63];
	}
	
	function EncodePath() {}
	
	var p = EncodePath.prototype;
	p._x = 0;
	p._y = 0;
	p.code = '';
	
	p.moveTo = function( x, y) {
		
		if(Math.abs(x)<=MAX_CHAR2 && Math.abs(y)<=MAX_CHAR2){
			this.code += encodeMethod(0, 2) + encodeNum2(x) + encodeNum2(y);
		}else {
			this.code += encodeMethod(0, 3) + encodeNum3(x) + encodeNum3(y);
		}
		
		this._x = x;
		this._y = y;
		
		return this;
	}
	
	p.lineTo = function( x, y) {
		var numChars, encodeNum;
		
		if(Math.abs(x-this._x)<=MAX_CHAR2 && Math.abs(y-this._y)<=MAX_CHAR2)
		{
			numChars = 2;
			encodeNum= encodeNum2;
		}else {
			numChars = 3;
			encodeNum = encodeNum3;
		}
		
		this.code += encodeMethod(1, numChars) + encodeNum(x-this._x) + encodeNum(y-this._y);
 
	
		this._x = x;
		this._y = y;
		
		return this;
	};
		
	p.quadraticCurveTo = function( x1, y1, x2, y2) {
		var numChars, encodeNum;
		
		if(Math.abs(x1-this._x)<=MAX_CHAR2 && Math.abs(y1-this._y)<=MAX_CHAR2 &&
			 Math.abs(x2-x1)<=MAX_CHAR2 && Math.abs(y2-y1)<=MAX_CHAR2)
		{
			numChars = 2;
			encodeNum = encodeNum2;
		}else {
			numChars = 3;
			encodeNum = encodeNum3;
		}
		
		this.code += 	encodeMethod(2, numChars) + encodeNum(x1-this._x) + encodeNum(y1-this._y) +
									encodeNum(x2-x1) + encodeNum(y2-y1);
		
		this._x = x2;
		this._y = y2;
		
		return this;
	}
		
		//-- cubic
	p.bezierCurveTo = function( x1, y1, x2, y2, x3, y3) {
		var numChars, encodeNum;
		
		if(Math.abs(x1-this._x)<=MAX_CHAR2 && Math.abs(y1-this._y)<=MAX_CHAR2 &&
			Math.abs(x2-x1)<=MAX_CHAR2 && Math.abs(y2-y1)<=MAX_CHAR2 &&
			Math.abs(x3-x2)<=MAX_CHAR2 && Math.abs(y3-y2)<=MAX_CHAR2)
		{
			numChars = 2;
			encodeNum = encodeNum2;
		}else {
			numChars = 3;
			encodeNum = encodeNum3;
		}
		
		this.code +=	encodeMethod(3, numChars) + encodeNum(x1-this._x) + encodeNum(y1-this._y) +
									encodeNum(x2-x1) + encodeNum(y2-y1) +
									encodeNum(x3-x2) + encodeNum(y3-y2);
		
		this._x = x3;
		this._y = y3;
		
		return this;
	}
	
	p.clear = function() {
		this.code = '';
		this._x = this._y = 0;
		return this;
	}
	
	return EncodePath;

})();

})();