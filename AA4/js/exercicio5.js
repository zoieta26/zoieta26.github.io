function convertCelciusToFahrenheit(celsius) {
    
    let fahrenheit = (celsius * 9/5) + 32;
    
    return fahrenheit;
}




// -- Não edite abaixo!

function conversaoCtoF() {
	let textCelcius = document.getElementById("celciusText")
	let textFahrenheit = document.getElementById("resultFahrenheit")
	textFahrenheit.textContent = convertCelciusToFahrenheit(textCelcius.value) + 
								 "ºF"
}