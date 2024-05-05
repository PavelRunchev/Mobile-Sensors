var $ = Dom7;

var device = Framework7.getDevice();
var app = new Framework7({
  name: 'My App', // App name
  theme: 'auto', // Automatic theme detection
  el: '#app', // App root element

  id: 'io.framework7.myapp', // App bundle ID
  // App store
  store: store,
  // App routes
  routes: routes,


  // Input settings
  input: {
    scrollIntoViewOnFocus: device.cordova && !device.electron,
    scrollIntoViewCentered: device.cordova && !device.electron,
  },
  // Cordova Statusbar settings
  statusbar: {
    iosOverlaysWebView: true,
    androidOverlaysWebView: false,
  },
  on: {
    init: function () {
      var f7 = this;
      if (f7.device.cordova) {
        // Init cordova APIs (see cordova-app.js)
        cordovaApp.init(f7);

        

      }
    },
  },

  
});




let compassId = null;
const threshold_value = 9.5;
let accelerometerId = null;
let lastPosition = null;


$(document).on('DOMContentLoaded', () => {
    $(document).on("page:init", '.page[data-name="accelerometer"]', () => {
        startAccelerometer();
    });
    $(document).on("page:init", '.page[data-name="compass"]', () => {
        startCompass();
    });
     $(document).on("page:init", '.page[data-name="gps-location"]', () => {
        gpsStart();
    });
})



//
// COMPASS
//
function startCompass() {
    if(navigator.compass.watchHeading !== undefined) {  
        compassId = navigator.compass.watchHeading(onSuccessCompass, onErrorCompass, { frequency: 1000 });
    } else {
        $('.compass-error').html('Compass is not supported!');
    }

    $('.loading-img').removeClass('show');
    $('.loading-img').addClass('hide');

    $('.compass-inner-container').removeClass('hide');
    $('.compass-inner-container').addClass('show');
}

let onSuccessCompass = function(heading) {
    const value = Math.abs(heading.magneticHeading);

    if((value >= 0 && value < 20) || (value > 340 && value <= 360)) {
        printValue('North', value);
    } else if(value >= 20 && value <= 70) {
        printValue('North / East', value);
    } else if(value > 70 && value < 110) {
        printValue('East', value);
    } else if(value >= 110 && value <= 160) {
        printValue('South / East', value);
    } else if(value > 160 && value < 200) {
        printValue('South', value);
    } else if(value >= 200 && value <= 250) {
        printValue('South / West', value);
    } else if(value > 250 && value < 290) {
        printValue('West', value);
    } else if(value >= 290 && value <= 340) {
        printValue('North / West', value);
    } else {
        onErrorCompass();
    }
}

function onErrorCompass() {
  $(".compass-error").html("Error access to compass!");
  navigator.compass.clearWatch(compassId);
}

function printValue(direction, value) {
  $(".compass-direction").html(`${direction}`);
  $(".compass-degree").html(`${value.toFixed(2)} &deg;`);
}


//
// ACCELEROMETER
//
function startAccelerometer() {
    if(navigator.accelerometer.watchAcceleration !== undefined) 
        accelerometerId = navigator.accelerometer.watchAcceleration(success, error, { frequency: 250 });
    else
        $('.accelerometer-error').html('Accelerometer is not supported!');


    $('.loading-img').removeClass('show');
    $('.loading-img').addClass('hide');

    $('.accelerometer-inner-container').removeClass('hide');
    $('.accelerometer-inner-container').addClass('show');
}

function success(acceleration) {
    let x = acceleration.x.toFixed(3);
    let y = acceleration.y.toFixed(3);
    let z = acceleration.z.toFixed(3);

    const sign = Math.sign(z);
    if(Math.abs(z) < threshold_value)
        lastPosition = "inclined";
    else {
        if(lastPosition !== 'to sky' && sign > 0) {
            lastPosition = 'to sky';
        } else if(lastPosition !== 'to ground' && sign < 0) {
            lastPosition = 'to ground';
        }
    }

    $('.accelerometer-position').text(lastPosition);
}   

function error(error) {
  let errorInfo;
  if(error.message === undefined) 
      errorInfo = "Accelerometer missing!";
  else
      errorInfo = "Error access Accelerometer!";

  $('.accelerometer').html(errorInfo);    
  if(accelerometerId) navigator.accelerometer.clearWatch();
}


function gpsStart() {
    const keyAPI = '0201f60900c44274a776b04cf2088853';
    const radius = 100;

    if('geolocation' in navigator) {

        navigator.geolocation.watchPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            $('.loading-img').removeClass('show');
            $('.loading-img').addClass('hide');
    
            $('.gps-inner-container').removeClass('hide');
            $('.gps-inner-container').addClass('show');
            app.request({url: 'https://api.geoapify.com/v1/geocode/reverse',
                type: 'GET',
                dataType: 'json',
                data: {
                    lat: lat,
                    lon: lng,
                    apiKey: keyAPI
                },
                success: function(data) {
                    const dataArray = data.features[0].properties.formatted.split(', ');
        
                    $('.country').html(` ${dataArray[3]}`);
                    $('.post-code').html(`${dataArray[2].split(' ')[0]}`);
                    $('.city').html(`${dataArray[2].split(' ')[1]}`);
                    $('.street').html(`${dataArray[0]}`);
                    $('.gps-radius').html(`${radius}`);
                    $('.gps-coordinate-latitude').html(` latitude: ${lat.toFixed(3)}&deg;`);
                    $('.gps-coordinate-longitude').html(`longitude: ${lng.toFixed(3)}&deg;`);

                    const map = L.map('my-map').setView([lat, lng], radius);
                        
                    // Retina displays require different mat tiles quality
                    const isRetina = L.Browser.retina;

                    const baseUrl = `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${keyAPI}`;
                    const retinaUrl = `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=${keyAPI}`;

                    L.tileLayer(isRetina ? retinaUrl : baseUrl, {
                        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                        apiKey: keyAPI,
                        maxZoom: 14,
                        id: 'osm-bright',
                    }).addTo(map);
                },
            
                error: function(error){
                    $('.error').html('Error getting user location!');
                    console.log(error)
                }
            });
        });
    } else {
        $('.error').html('Geolocation is not supported!');
    }
}