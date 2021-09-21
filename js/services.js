/* THE MAP IS INITIALIZED */

var latitude = 23.634501;

var longitude = -102.552784;

var platform = new H.service.Platform({
  apikey: constants.API_KEY,
});
var defaultLayers = platform.createDefaultLayers();

var map = new H.Map(
  document.getElementById("divMap"),
  defaultLayers.vector.normal.map,
  {
    center: { lat: latitude, lng: longitude },
    zoom: 12,
    pixelRatio: window.devicePixelRatio || 1,
  }
);

window.addEventListener("resize", () => map.getViewPort().resize());

var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

var ui = H.ui.UI.createDefault(map, defaultLayers);

var icon = new H.map.Icon(constants.defaultMarkup);

var defaultMarker = new H.map.Marker(
  { lat: latitude, lng: longitude },
  { icon: icon }
);
map.addObject(defaultMarker);

getLocation();

/* THE MAP IS INITIALIZED */

var direction = "";

var coordinates = "";

var lineString = "";

var polygon = "";

var figure = "";

var newBbox = "";

var decodedPolygon = "";

var categoryPositions = "";

function getLocation() {
  if (navigator.geolocation) {
    var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, options);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function geoSuccess(position) {
  map.removeObject(defaultMarker);
  latitude = position.coords.latitude;
  longitude = position.coords.longitude;
  map.setCenter({ lat: latitude, lng: longitude });
  console.log("lat:" + latitude + " lng:" + longitude);
  console.log(`More or less ${position.coords.accuracy} meters.`);

  addMarker(map, latitude, longitude, icon);

  document.getElementById("ipt_lat").value = latitude;

  document.getElementById("ipt_lng").value = longitude;

  reverseGeocoding(latitude, longitude);
}

function geoError() {
  console.log("Geocoder failed.");
  reverseGeocoding(latitude, longitude);
}

function searchGeocoding() {
  direction = document.getElementById("ipt_geocoding").value;

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("Search result: " + result);

      var optionsArray = JSON.parse(result);

      var list = document.getElementById("list_suggestions");

      if (list.length > 0) {
        while (list.length > 0) {
          list.remove(0);
        }
      }

      var options = "";

      for (let index = 0; index < optionsArray.items.length; index++) {
        var element = optionsArray.items[index].title;

        options += '<option value="' + element + '" />';
      }

      console.log(options);

      list.innerHTML = options;
      setGeocoding();
    }
  });

  xhr.open(
    "GET",
    `https://geocode.search.hereapi.com/v1/geocode?apiKey=${constants.API_KEY}&q=${direction}`
  );

  xhr.send();
}

function setGeocoding() {
  direction = document.getElementById("ipt_geocoding").value;

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("Obtain geocode result: " + result);

      var optionsArray = JSON.parse(result);

      for (let index = 0; index < optionsArray.items.length; index++) {
        var title = optionsArray.items[index].title;

        if (direction.includes(title)) {
          var newPosition = optionsArray.items[index].position;

          map.setCenter({ lat: newPosition.lat, lng: newPosition.lng });
          map.setZoom(14);

          coordinates = newPosition;

          console.log(
            "New position set: " + coordinates.lat + "," + coordinates.lng
          );
          defaultMarker ? map.removeObject(defaultMarker) : null;

          getIsoline15minPedestrian();
        }
      }
    }
  });

  xhr.open(
    "GET",
    `https://geocode.search.hereapi.com/v1/geocode?apiKey=${constants.API_KEY}&q=${direction}`
  );

  xhr.send();
}

function getIsoline15minPedestrian() {
  document.getElementById("btnPedestrianOne").className = "btnOptionClick";
  document.getElementById("btnPedestrianTwo").className = "btnOption";
  document.getElementById("btnCar").className = "btnOption";

  map.removeObjects(map.getObjects());

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("Isoline15minPedestrian result: " + result);

      var results = JSON.parse(result);

      lineString = new H.geo.LineString.fromFlexiblePolyline(
        results.isolines[0].polygons[0].outer
      ); //Obtains the polygon

      decodedPolygon = decode(results.isolines[0].polygons[0].outer);

      polygon = new H.map.Polygon(lineString, {
        style: {
          strokeColor: "#2c2f33",
          fillColor: "rgba(162, 80, 229, 0.2)",
          lineWidth: 2,
          lineCap: "round",
          lineJoin: "miter",
          miterLimit: 1,
          lineDash: [],
          lineDashOffset: 0,
        },
      });

      console.log("Decoded polygon: " + Object.values(polygon));

      map.addObject(polygon);

      var bbox = polygon.getBoundingBox();

      figure = new H.map.Rect(bbox, {
        style: {
          fillColor: "rgba(153, 170, 181, 0.2)",
          strokeColor: "#23272a",
          lineWidth: 2,
        },
      });

      map.addObject(figure);
      map.setCenter({ lat: coordinates.lat, lng: coordinates.lng });
      map.setZoom(16);

      addMarker(map, coordinates.lat, coordinates.lng, icon);

      newBbox = `${bbox.getLeft()},${bbox.getBottom()},${bbox.getRight()},${bbox.getTop()}`;

      searchAllCategories();
    }
  });

  xhr.open(
    "GET",
    `https://isoline.router.hereapi.com/v8/isolines?apiKey=${constants.API_KEY}&origin=${coordinates.lat},${coordinates.lng}&range[type]=time&range[values]=900&transportMode=pedestrian`
  );

  xhr.send();
}

function getIsoline20minPedestrian() {
  document.getElementById("btnPedestrianOne").className = "btnOption";
  document.getElementById("btnPedestrianTwo").className = "btnOptionClick";
  document.getElementById("btnCar").className = "btnOption";

  map.removeObjects(map.getObjects());

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("Isoline20minPedestrian result: " + result);

      var results = JSON.parse(result);

      lineString = new H.geo.LineString.fromFlexiblePolyline(
        results.isolines[0].polygons[0].outer
      );

      decodedPolygon = decode(results.isolines[0].polygons[0].outer);

      polygon = new H.map.Polygon(lineString, {
        style: {
          strokeColor: "#2c2f33",
          fillColor: "rgba(162, 80, 229, 0.2)",
          lineWidth: 2,
          lineCap: "round",
          lineJoin: "miter",
          miterLimit: 1,
          lineDash: [],
          lineDashOffset: 0,
        },
      });

      map.addObject(polygon);

      var bbox = polygon.getBoundingBox();

      figure = new H.map.Rect(bbox, {
        style: {
          fillColor: "rgba(153, 170, 181, 0.2)",
          strokeColor: "#23272a",
          lineWidth: 2,
        },
      });

      map.addObject(figure);
      map.setCenter({ lat: coordinates.lat, lng: coordinates.lng });
      map.setZoom(15.5);

      addMarker(map, coordinates.lat, coordinates.lng, icon);

      newBbox = `${bbox.getLeft()},${bbox.getBottom()},${bbox.getRight()},${bbox.getTop()}`;
      searchAllCategories();
    }
  });

  xhr.open(
    "GET",
    `https://isoline.router.hereapi.com/v8/isolines?apiKey=${constants.API_KEY}&origin=${coordinates.lat},${coordinates.lng}&range[type]=time&range[values]=1200&transportMode=pedestrian`
  );

  xhr.send();
}

function getIsoline20minCar() {
  document.getElementById("btnPedestrianOne").className = "btnOption";
  document.getElementById("btnPedestrianTwo").className = "btnOption";
  document.getElementById("btnCar").className = "btnOptionClick";

  map.removeObjects(map.getObjects());

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("Isoline20minCar result: " + result);

      var results = JSON.parse(result);

      lineString = new H.geo.LineString.fromFlexiblePolyline(
        results.isolines[0].polygons[0].outer
      );

      decodedPolygon = decode(results.isolines[0].polygons[0].outer);

      polygon = new H.map.Polygon(lineString, {
        style: {
          strokeColor: "#2c2f33",
          fillColor: "rgba(162, 80, 229, 0.2)",
          lineWidth: 2,
          lineCap: "round",
          lineJoin: "miter",
          miterLimit: 1,
          lineDash: [],
          lineDashOffset: 0,
        },
      });

      map.addObject(polygon);

      var bbox = polygon.getBoundingBox();

      figure = new H.map.Rect(bbox, {
        style: {
          fillColor: "rgba(153, 170, 181, 0.2)",
          strokeColor: "#23272a",
          lineWidth: 2,
        },
      });

      map.addObject(figure);
      map.setCenter({ lat: coordinates.lat, lng: coordinates.lng });
      map.setZoom(13);

      addMarker(map, coordinates.lat, coordinates.lng, icon);

      newBbox = `${bbox.getLeft()},${bbox.getBottom()},${bbox.getRight()},${bbox.getTop()}`;
      searchAllCategories();
    }
  });

  xhr.open(
    "GET",
    `https://isoline.router.hereapi.com/v8/isolines?apiKey=${constants.API_KEY}&origin=${coordinates.lat},${coordinates.lng}&range[type]=time&range[values]=1200&transportMode=car`
  );

  xhr.send();
}

function getCategories(bbox, coordinates, option) {
  var category = "";
  var svgMarkup = "";
  var categoryTitle = "";
  var styleCategory = "";
  var countCategory = 0;

  switch (option) {
    case "grocery":
      category = "600-6300-0066";
      svgMarkup = constants.grocerieMarkup;
      categoryTitle = "GROCERIES";
      styleCategory = `margin-right: 25%; font-weight: 600; font-size: 12px; width: 30%; color: rgba(255,186,109, 1);`;
      break;
    case "hospitals":
      category =
        "800-8000-0159,800-8000-0325,600-6400-0000,800-8000-0155,600-6400-0070";
      svgMarkup = constants.hospitalMarkup;
      categoryTitle = "MEDICAL";
      styleCategory = `margin-right: 25%; font-weight: 600; font-size: 12px; width: 30%; color: rgba(254,0,136, 1)`;
      break;
    case "cinemas_theaters":
      category = "200-2100-0019,200-2200-0000,200-2200-0020";
      svgMarkup = constants.cinemaMarkup;
      categoryTitle = "ENTERTAINMENT";
      styleCategory = `margin-right: 25%; font-weight: 600; font-size: 12px; width: 30%; color: rgba(161,0,254, 1)`;
      break;
    case "schools":
      category = "700-7400-0286,800-8200-0174";
      svgMarkup = constants.schoolMarkup;
      categoryTitle = "EDUCATION";
      styleCategory = `margin-right: 25%;; font-weight: 600; font-size: 12px; width: 30%; color: rgba(0,210,254, 1)`;
      break;
    case "public_transport":
      category =
        "400-4100-0035,400-4100-0036,400-4100-0037,400-4100-0038,400-4100-0039,400-4100-0040,400-4100-0042,400-4100-0043,400-4100-0044,400-4100-0337,400-4100-0338,400-4100-0046,400-4100-0045,400-4100-0339,400-4100-0340,400-4100-0341,400-4100-0342";
      svgMarkup = constants.publicTransportMarkup;
      categoryTitle = "TRANSIT";
      styleCategory = `margin-right: 25%; font-weight: 600; font-size: 12px; width: 30%; color: rgba(75,48,254, 1)`;
      break;
    case "outdoor_recreation":
      category =
        "550-5510-0000,550-5510-0202,550-5510-0203,550-5510-0204,550-5510-0205,550-5510-0227,550-5510-0242,550-5510-0359,550-5510-0378,550-5510-0379,550-5510-0380,550-5520-0207,550-5520-0208,550-5520-0209,550-5520-0210,550-5520-0211,550-5520-0212,550-5520-0228,550-5520-0357";
      svgMarkup = constants.outdoorRecreationMarkup;
      categoryTitle = "LEISURE";
      styleCategory = `margin-right: 25%; font-weight: 600; font-size: 12px; width: 30%; color: rgba(17,196,60, 1);`;
      break;
  }

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("Search places category result: " + result);

      categoryPositions = JSON.parse(result);
      console.log(categoryPositions);

      for (let index = 0; index < categoryPositions.items.length; index++) {
        var categoryPosition = categoryPositions.items[index].position;

        var validateOnPolygon = pointInPolygon(
          [categoryPosition.lat, categoryPosition.lng],
          decodedPolygon.polyline
        );

        if (validateOnPolygon) {
          var icon = new H.map.Icon(svgMarkup);
          var htmlInfo =
            `<div style="margin-bottom: 15px; font-weight: 600; font-size: 16.5px; width: 250px;">${categoryPositions.items[index].title}</div>` +
            `<div style="margin-bottom: 15px; font-weight: 400; font-size: 12px;">${categoryPositions.items[index].address.label}</div>` +
            `<div>
            <label style="${styleCategory}">${categoryTitle}</label>
            <button style="margin-left: 25%; background-color: rgba(0, 0, 0, 0); border: none; color: rgba(255, 141, 0, 0.8)" type="submit" 
            onclick="window.open('https://share.here.com/l/${categoryPosition.lat},${categoryPosition.lng}?z=14&p=yes')">
            <i class="fas fa-directions fa-lg"></i>
            </button>
            </div>`;

          addMarkerCategory(
            map,
            categoryPosition.lat,
            categoryPosition.lng,
            icon,
            htmlInfo
          );
        }

        countCategory += 1;
      }

      var btnCategory = document.getElementById(option);
      btnCategory.innerHTML =
        option == "grocery"
          ? countCategory
          : option == "hospitals"
          ? countCategory
          : option == "cinemas_theaters"
          ? countCategory
          : option == "schools"
          ? countCategory
          : option == "public_transport"
          ? countCategory
          : option == "outdoor_recreation"
          ? countCategory
          : "";
    }
  });

  xhr.open(
    "GET",
    `https://browse.search.hereapi.com/v1/browse?apiKey=NbbU1vvcZjvvWOG9FtGcpVjSyFoyFpa3WrTRi-XNsDA&at=${coordinates.lat},${coordinates.lng}&categories=${category}&in=bbox:${bbox}&limit=5`
  );

  xhr.send();
}

function addMarkerCategory(map, lat, lng, icon, html) {
  var group = new H.map.Group();

  map.addObject(group);

  group.addEventListener(
    "tap",
    function (evt) {
      var bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
        // read custom data
        content: evt.target.getData(),
      });
      ui.addBubble(bubble);
    },
    false
  );

  var marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon });
  marker.setData(html);
  group.addObject(marker);
}

function addMarker(map, lat, lng, icon) {
  defaultMarker = new H.map.Marker(
    {
      lat: lat,
      lng: lng,
    },
    { icon: icon, volatility: true }
  );

  defaultMarker.draggable = true;

  map.addObject(defaultMarker);

  // disable the default draggability of the underlying map
  // and calculate the offset between mouse and target's position
  // when starting to drag a marker object:
  map.addEventListener(
    "dragstart",
    function (ev) {
      var target = ev.target,
        pointer = ev.currentPointer;
      if (target instanceof H.map.Marker) {
        var targetPosition = map.geoToScreen(target.getGeometry());
        target["offset"] = new H.math.Point(
          pointer.viewportX - targetPosition.x,
          pointer.viewportY - targetPosition.y
        );
        behavior.disable();
      }
    },
    false
  );

  // re-enable the default draggability of the underlying map
  // when dragging has completed
  map.addEventListener(
    "dragend",
    function (ev) {
      var target = ev.target;
      if (target instanceof H.map.Marker) {
        behavior.enable();
      }

      //console.log(defaultMarker.getGeometry().lat);

      document.getElementById("ipt_lat").value =
        defaultMarker.getGeometry().lat;

      document.getElementById("ipt_lng").value =
        defaultMarker.getGeometry().lng;
    },
    false
  );

  // Listen to the drag event and move the position of the marker
  // as necessary
  map.addEventListener(
    "drag",
    function (ev) {
      var target = ev.target,
        pointer = ev.currentPointer;
      if (target instanceof H.map.Marker) {
        target.setGeometry(
          map.screenToGeo(
            pointer.viewportX - target["offset"].x,
            pointer.viewportY - target["offset"].y
          )
        );
      }
    },
    false
  );
}

function searchGroceries() {
  getCategories(newBbox, coordinates, "grocery");
}

function searchHospitals() {
  getCategories(newBbox, coordinates, "hospitals");
}

function searchCinemas() {
  getCategories(newBbox, coordinates, "cinemas_theaters");
}

function searchSchools() {
  getCategories(newBbox, coordinates, "schools");
}

function searchPublicTransport() {
  getCategories(newBbox, coordinates, "public_transport");
}

function searchOutdoorRecreation() {
  getCategories(newBbox, coordinates, "outdoor_recreation");
}

function searchAllCategories() {
  searchGroceries();
  searchHospitals();
  searchCinemas();
  searchSchools();
  searchPublicTransport();
  searchOutdoorRecreation();
}

function reverseGeocoding(lat, lng) {
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      console.log("Reverse geocoding result: " + this.responseText);
      var result = JSON.parse(this.responseText);

      document.getElementById("ipt_geocoding").value = result.items[0].title;

      searchGeocoding();
    }
  });

  xhr.open(
    "GET",
    `https://revgeocode.search.hereapi.com/v1/revgeocode?apiKey=${constants.API_KEY}&at=${lat},${lng}`
  );

  xhr.send();
}
