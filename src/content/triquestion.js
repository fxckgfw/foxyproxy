function onLoad() {
  var btn1 = document.getElementById("1");
  
  var inn = window.arguments[0].inn;
  document.getElementById("title").value = inn.title;
  btn1.label = inn.btn1Text;
  document.getElementById("2").label = inn.btn2Text;
  document.getElementById("3").label = inn.btn3Text;
  btn1.focus();
	sizeToContent();
}

function onOK(v) {
  window.arguments[0].out = {value:v};
  close();
}