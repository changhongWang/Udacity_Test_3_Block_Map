/**
 *  Core javascript File for Block Map
 */
var map;
var markers = [];
var foursquareAPIUrl = "https://api.foursquare.com/v2";
var locationCenter = "30.6546950027,104.0805414353"; // 地图中心点，成都太古里
var locationCenterObj = {lat: 30.6546950027, lng: 104.0805414353};

var MapViewModel = function () {
    var self = this; //ko
    var map, infoWindow; //地图，弹窗

    //ko绑定
    self.places = ko.observableArray([]);
    self.markers = ko.observableArray([]);
    self.filterPlaces = ko.observableArray([]);
    self.searchText = ko.observable('');
    self.errorMessage = ko.observable('');

    self.clickPlaces = function (item) {
        var currentMarkerId = item.id;

        self.markers().forEach(function (item) {
            if (currentMarkerId == item.id) {
                //动画
                if (item.marker.getAnimation()) {
                    item.marker.setAnimation(null);
                } else {
                    item.marker.setAnimation(google.maps.Animation.BOUNCE);
                }
                setTimeout(function () {
                    item.marker.setAnimation(null);
                }, 1400);
                showMarkerInfo(item.id, item.marker);
            }
        });
    };
    //search place.
    self.searchPlaces = function () {
        //搜索方法(直接在页面上用ko做的绑定)
        var searchWord = self.searchText().toLowerCase();
        var bounds = new google.maps.LatLngBounds();
        if (!searchWord) {
            return;
        } else {
            //清空数组
            self.filterPlaces([]);


            self.markers().forEach(function (place) {
                var searchIndex = place.name.toLowerCase().indexOf(searchWord);
                if (searchIndex >= 0) {

                    place.marker.setVisible(true);
                    //showMarkerInfo(place.id, place.marker);
                    self.filterPlaces.push({ name: place.name, id: place.id });
                } else {
                    // hide marker
                    place.marker.setVisible(false);
                }
                place.marker.setMap(map);
                bounds.extend(place.marker.position);
            });

            map.fitBounds(bounds);
            //隐藏信息弹窗
            hideMarkerInfo();

        }
    };

    self.reset = function () {
        //重置搜索框(直接在页面上用ko做的绑定)
        var bounds = new google.maps.LatLngBounds();
        self.searchText('');

        self.filterPlaces(self.places());
        //show
        self.markers().forEach(function (place) {
            place.marker.setVisible(true);
            place.marker.setMap(map);
            bounds.extend(place.marker.position);
        });
        map.fitBounds(bounds);
        //隐藏信息弹窗
        hideMarkerInfo();
        hideErrorMsg();

    };

    //获取定位附近餐馆(利用foursquare API)
    function getPlaces() {
        $.ajax({
            url: foursquareAPIUrl + '/venues/search?ll=' + locationCenter +
            '&client_id=OGNTWEIFONJPR0O5ELTI5WK0HRNIWWJYK5MA2FIZ405WHHDW&client_secret=HN1WBO1CZGQKIE4FQ4DBNELX2BEW0UXQQP0ZSMXBHBP3BQHI&v=20180101&limit=15',
            dataType: "json"
        }).done(function (result) {
            if (result.meta.code == 200) {
                var resultData = result.response.venues;
                addMarker(resultData);
                self.filterPlaces(result.response.venues);
                self.places(resultData);

                hideErrorMsg();
            }
        }).fail(function (e) {
            self.errorMessage('错误：获取兴趣点数据失败');
            showErrorMsg();
        });
    }

    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 18,
            center: locationCenterObj,
            streetViewControlOptions: {
                position: google.maps.ControlPosition.LEFT_BOTTOM
            },
            mapTypeControl: false,
            panControl: false
        });

        infoWindow = new google.maps.InfoWindow({maxWidth: 300});
        getPlaces();
    }

    //展示信息弹窗
    function showMarkerInfo(venueId, marker) {
        $.ajax({
            url: foursquareAPIUrl + '/venues/' + venueId +
            '?client_id=NONGGLXBKX5VFFIKKEK1HXQPFAFVMEBTRXBWJUPEN4K14JUE&client_secret=ZZDD1SLJ4PA2X4AJ4V23OOZ53UM4SFZX0KORGWP5TZDK4YYJ&v=20180101&limit=10',
            dataType: "json",
            success: function (result) {
                if (result.meta.code == 200) {
                    var venueData = result.response.venue;
                    var venueFirstImage = "http://placehold.it/200x200";

                    if (venueData.photos.groups.length > 0 && venueData.photos.groups[0].items.length) {
                        venueFirstImage = venueData.photos.groups[0].items[0].prefix + "200x200" + venueData.photos.groups[0].items[0].suffix;
                    }


                    var venueDescription = venueData.description ? venueData.description : "";


                    var contentString = "<div style='width:220px;'><h4>" + venueData.name + "</h4><div><img src=" + venueFirstImage + "></div><div><p>" + venueDescription + "</p></div><div><a target='_blank' href=" + venueData.canonicalUrl + "><img src='./img/foursquare.png' style='width:15px;height:15px;border-radius:3px;margin-right:5px;vertical-align: middle;'>在FourSquare查看详情</a></div></div>";

                    marker.animation = google.maps.Animation.DROP;
                    infoWindow.setContent(contentString);

                    //map.setCenter(marker.position);
                    infoWindow.open(map, marker);

                    hideErrorMsg();
                }
            },
            error: function (e) {
                self.errorMessage('错误：从FourSquare获取信息失败。');
                showErrorMsg();
            }
        });
    }
    //弹窗关闭
    function hideMarkerInfo(){
        infoWindow.setContent('');
        infoWindow.close();
    }
    function showErrorMsg(){
        $('.ERROR-MSG').show();
    }
    function hideErrorMsg(){
        $('.ERROR-MSG').hide();
    }

    //add marker
    function addMarker(places) {
        var bounds = new google.maps.LatLngBounds();

        places.forEach(function (place) {
            var venueId = place.id;
            var location = place.location;
            var latitude = location.lat;
            var longitude = location.lng;
            var title = place.name;

            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(latitude, longitude),
                title: title,
                map: map
            });

            self.markers.push({id: venueId, name: title, marker: marker});

            marker.addListener("click", function () {//标记点击事件
                var that = this;
                that.setAnimation(google.maps.Animation.BOUNCE);

                setTimeout(function () {
                    marker.setAnimation(null);
                }, 1400);
                showMarkerInfo(venueId, that);
            });

            marker.setMap(map);
            bounds.extend(marker.position);

        });

        map.fitBounds(bounds);//改变地图中心点位置，包括所有markers
    }

    initMap();
};

function initPage() {
    ko.applyBindings(new MapViewModel());
}

function loadingError() {
    alert('loading error, Please check your network, Especially check about VPN.')
}