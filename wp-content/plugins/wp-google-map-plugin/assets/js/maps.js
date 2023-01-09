/**
 * This jQuery plugin displays map and it's components.
 * @author Flipper Code (hello *at* flippercode *dot* com)
 * @version 1.0
 */
(function($, window, document, undefined) {
    "use strict";

    function GoogleMaps(element, map_data) {
        var options;
        this.element = element;
        this.map_data = $.extend({}, {}, map_data);
        options = this.map_data.map_options;
        this.settings = $.extend({
            "zoom": "5",
            "map_type_id": "ROADMAP",
            "scroll_wheel": true,
            "map_visual_refresh": false,
            "full_screen_control": false,
            "full_screen_control_position": "BOTTOM_RIGHT",
            "zoom_control": true,
            "zoom_control_style": "SMALL",
            "zoom_control_position": "TOP_LEFT",
            "map_type_control": true,
            "map_type_control_style": "HORIZONTAL_BAR",
            "map_type_control_position": "RIGHT_TOP",
            "scale_control": true,
            "street_view_control": true,
            "street_view_control_position": "TOP_LEFT",
            "overview_map_control": true,
            "center_lat": "40.6153983",
            "center_lng": "-74.2535216",
            "draggable": true
        }, {}, options);
        this.container = $("div[rel='" + $(this.element).attr("id") + "']");

        var suppress_markers = false;
        if (this.map_data.map_tabs && this.map_data.map_tabs.direction_tab) {
            suppress_markers = this.map_data.map_tabs.direction_tab.suppress_markers;
        }
        this.directionsService = new google.maps.DirectionsService();
        this.directionsDisplay = new google.maps.DirectionsRenderer({
            suppressMarkers: suppress_markers,
        });
        this.drawingmanager = {};
        this.geocoder = new google.maps.Geocoder();
        this.places = [];
        this.show_places = [];
        this.categories = {};
        this.tabs = [];
        this.all_shapes = [];
        this.wpgmp_polylines = [];
        this.wpgmp_polygons = [];
        this.wpgmp_circles = [];
        this.wpgmp_shape_events = [];
        this.wpgmp_rectangles = [];
        this.per_page_value = 0;
        this.current_amenities = [];
        this.route_directions = [];
        this.search_area = '';
        this.markerClusterer = null;
        this.infowindow_marker = new google.maps.InfoWindow();
        this.init();
    }

    GoogleMaps.prototype = {

        init: function() {
            var map_obj = this;
            var center = new google.maps.LatLng(map_obj.settings.center_lat, map_obj.settings.center_lng);
            map_obj.map = new google.maps.Map(map_obj.element, {
                zoom: parseInt(map_obj.settings.zoom),
                center: center,
                disableDoubleClickZoom: (map_obj.settings.scroll_wheel != 'false'),
                scrollwheel: map_obj.settings.scroll_wheel,
                zoomControl: (map_obj.settings.zoom_control === true),
                fullscreenControl: (map_obj.settings.full_screen_control === true),
                fullscreenControlOptions: {
                    position: eval("google.maps.ControlPosition." + map_obj.settings.full_screen_control_position)
                },
                zoomControlOptions: {
                    style: eval("google.maps.ZoomControlStyle." + map_obj.settings.zoom_control_style),
                    position: eval("google.maps.ControlPosition." + map_obj.settings.zoom_control_position)
                },
                mapTypeControl: (map_obj.settings.map_type_control == true),
                mapTypeControlOptions: {
                    style: eval("google.maps.MapTypeControlStyle." + map_obj.settings.map_type_control_style),
                    position: eval("google.maps.ControlPosition." + map_obj.settings.map_type_control_position)
                },
                scaleControl: (map_obj.settings.scale_control == true),
                streetViewControl: (map_obj.settings.street_view_control == true),
                streetViewControlOptions: {
                    position: eval("google.maps.ControlPosition." + map_obj.settings.street_view_control_position)
                },
                overviewMapControl: (map_obj.settings.overview_map_control == true),
                overviewMapControlOptions: {
                    opened: map_obj.settings.overview_map_control
                },
                draggable: map_obj.settings.draggable,
                mapTypeId: eval("google.maps.MapTypeId." + map_obj.settings.map_type_id),
                styles: eval(map_obj.map_data.styles)
            });

            map_obj.map_loaded();
            map_obj.responsive_map();
            map_obj.create_markers();
            map_obj.display_markers();

            if (map_obj.map_data.street_view) {
                map_obj.set_streetview(center);
            }

            if (map_obj.map_data.bicyle_layer) {
                map_obj.set_bicyle_layer();
            }

            if (map_obj.map_data.traffic_layer) {
                map_obj.set_traffic_layer();
            }

            if (map_obj.map_data.transit_layer) {
                map_obj.set_transit_layer();
            }

            if (map_obj.map_data.panoramio_layer) {
                map_obj.set_panoramic_layer();
            }

            if (map_obj.settings.display_45_imagery == '45') {
                map_obj.set_45_imagery();
            }

            if (typeof map_obj.map_data.map_visual_refresh === true) {
                map_obj.set_visual_refresh();
            }

            if (map_obj.settings.search_control == true) {
                map_obj.show_search_control();
            }

            if (map_obj.map_data.listing) {

                $(map_obj.container).on('click', '.categories_filter_reset_btn', function() {

                    $(map_obj.container).find('.wpgmp_filter_wrappers select').each(function() {
                        $(this).find('option:first').attr('selected', 'selected');
                    });
                    $('.wpgmp_search_input').val('');
                    map_obj.update_filters();

                });


                $(map_obj.container).on('change', '[data-filter="dropdown"]', function() {
                    map_obj.update_filters();
                });

                $(map_obj.container).on('click', '[data-filter="checklist"]', function() {
                    map_obj.update_filters();
                });

                $(map_obj.container).on('click', '[data-filter="list"]', function() {

                    if ($(this).hasClass('fc_selected')) {
                        $(this).removeClass('fc_selected');
                    } else {
                        $(this).addClass('fc_selected');
                    }

                    map_obj.update_filters();
                });

                map_obj.display_filters_listing();

                $.each(map_obj.map_data.listing.filters, function(key, filter) {

                    $(map_obj.container).find('select[name="' + filter + '"]').on('change', function() {
                        map_obj.update_filters();
                    });

                });

                $(map_obj.container).find('[data-name="radius"]').on('change', function() {

                    var search_data = $(map_obj.container).find('[data-input="wpgmp-search-text"]').val();
                    if (search_data.length >= 2 && $(this).val() != '') {
                        map_obj.geocoder.geocode({
                            "address": search_data
                        }, function(results, status) {

                            if (status == google.maps.GeocoderStatus.OK) {
                                map_obj.search_area = results[0].geometry.location;
                                map_obj.update_filters();
                            }

                        });
                    } else {
                        map_obj.search_area = '';
                        map_obj.update_filters();
                    }


                });

                $(map_obj.container).find('[data-filter="map-perpage-location-sorting"]').on('change', function() {

                    map_obj.per_page_value = $(this).val();
                    map_obj.update_filters();

                });

                $(map_obj.container).find('[data-input="wpgmp-search-text"]').on('keyup', function() {
                    var search_data = $(this).val();
                    $(map_obj.container).find('[data-filter="map-radius"]').val('');
                    map_obj.search_area = '';
                    // Apply default radius
                    if (search_data.length >= 2 && map_obj.map_data.listing.apply_default_radius == true) {
                        if (search_data.length >= 2) {
                            map_obj.geocoder.geocode({
                                "address": search_data
                            }, function(results, status) {

                                if (status == google.maps.GeocoderStatus.OK) {
                                    map_obj.search_area = results[0].geometry.location;
                                    map_obj.update_filters();
                                }

                            });
                        }

                    } else {
                        map_obj.update_filters();
                    }


                });

            }

            $("body").on("click", ".wpgmp_marker_link", function() {
                map_obj.open_infowindow($(this).data("marker"));
                $('html, body').animate({
                    scrollTop: $(map_obj.container).offset().top - 150
                }, 500);
            });

            $(map_obj.container).on("click", "a[data-marker]", function() {
                map_obj.open_infowindow($(this).data("marker"));
                $('html, body').animate({
                    scrollTop: $(map_obj.container).offset().top - 150
                }, 500);
            });

            $(map_obj.container).on("click", "a[data-marker]", function() {
                map_obj.open_infowindow($(this).data("marker"));
            });

            // REGISTER AUTO SUGGEST
            map_obj.google_auto_suggest($(".wpgmp_auto_suggest"));

        },

        createMarker: function(place) {
            var map_obj = this;
            var map = map_obj.map;
            var placeLoc = place.geometry.location;
            var image = {
                url: place.icon,
                size: new google.maps.Size(25, 25),
                scaledSize: new google.maps.Size(25, 25)
            };

            place.marker = new google.maps.Marker({
                map: map,
                position: place.geometry.location,
                icon: image
            });

            google.maps.event.addListener(place.marker, 'click', function() {
                if (map_obj.settings.map_infowindow_customisations === true)
                    map_obj.amenity_infowindow.setContent('<div class="wpgmp_infowindow"><div class="wpgmp_iw_content">' + place.name + '</div></div>');
                else
                    map_obj.amenity_infowindow.setContent(place.name);
                map_obj.amenity_infowindow.open(map, this);
            });
            map_obj.current_amenities.push(place);
        },

        marker_bind: function(marker) {

            var map_obj = this;

            google.maps.event.addListener(marker, 'drag', function() {

                var position = marker.getPosition();

                map_obj.geocoder.geocode({
                    latLng: position
                }, function(results, status) {

                    if (status == google.maps.GeocoderStatus.OK) {

                        $("#googlemap_address").val(results[0].formatted_address);

                        $(".google_city").val(map_obj.wpgmp_finddata(results[0], 'administrative_area_level_3') || map_obj.wpgmp_finddata(results[0], 'locality'));
                        $(".google_state").val(map_obj.wpgmp_finddata(results[0], "administrative_area_level_1"));
                        $(".google_country").val(map_obj.wpgmp_finddata(results[0], "country"));

                        if (results[0].address_components) {
                            for (var i = 0; i < results[0].address_components.length; i++) {
                                for (var j = 0; j < results[0].address_components[i].types.length; j++) {
                                    if (results[0].address_components[i].types[j] == "postal_code") {
                                        wpgmp_zip_code = results[0].address_components[i].long_name;
                                        $(".google_postal_code").val(wpgmp_zip_code);
                                    }
                                }
                            }
                        }
                    }
                });

                $(".google_latitude").val(position.lat());
                $(".google_longitude").val(position.lng());
            });

        },

        google_auto_suggest: function(obj) {

            var map_obj = this;

            obj.each(function() {
                var current_input = this;
                var autocomplete = new google.maps.places.Autocomplete(this);

                autocomplete.bindTo('bounds', map_obj.map);

                if ($(this).attr("name") == 'location_address') {
                    var infowindow = map_obj.infowindow_marker;
                    var marker = new google.maps.Marker({
                        map: map_obj.map,
                        draggable: true,
                        anchorPoint: new google.maps.Point(0, -29)
                    });

                    map_obj.marker_bind(marker);

                    google.maps.event.addListener(autocomplete, 'place_changed', function() {

                        var place = autocomplete.getPlace();
                        if (!place.geometry) {
                            return;
                        }

                        // If the place has a geometry, then present it on a map.
                        if (place.geometry.viewport) {
                            map_obj.map.fitBounds(place.geometry.viewport);
                        } else {
                            map_obj.map.setCenter(place.geometry.location);
                            map_obj.map.setZoom(17);
                        }

                        $(".google_latitude").val(place.geometry.location.lat());
                        $(".google_longitude").val(place.geometry.location.lng());
                        $(".google_city").val(map_obj.wpgmp_finddata(place, 'administrative_area_level_3') || map_obj.wpgmp_finddata(place, 'locality'));
                        $(".google_state").val(map_obj.wpgmp_finddata(place, "administrative_area_level_1"));
                        $(".google_country").val(map_obj.wpgmp_finddata(place, "country"));
                        if (place.address_components) {
                            for (var i = 0; i < place.address_components.length; i++) {
                                for (var j = 0; j < place.address_components[i].types.length; j++) {
                                    if (place.address_components[i].types[j] == "postal_code") {
                                        wpgmp_zip_code = place.address_components[i].long_name;
                                        $(".google_postal_code").val(wpgmp_zip_code);
                                    }
                                }
                            }
                        }

                        marker.setPosition(place.geometry.location);
                        marker.setVisible(true);
                    });
                } else {

                    google.maps.event.addListener(autocomplete, 'place_changed', function() {

                        var place = autocomplete.getPlace();
                        if (!place.geometry) {
                            return;
                        }

                        $().val(place.geometry.location.lat());
                        $(current_input).data('longitude', place.geometry.location.lng());
                        $(current_input).data('latitude', place.geometry.location.lat());

                    });
                }
            });
        },

        wpgmp_finddata: function(result, type) {
            var component_name = "";
            for (var i = 0; i < result.address_components.length; ++i) {
                var component = result.address_components[i];
                $.each(component.types, function(index, value) {
                    if (value == type) {
                        component_name = component.long_name;
                    }
                });


            }
            return component_name;
        },

        open_infowindow: function(current_place) {
            var map_obj = this;

            $.each(this.map_data.places, function(key, place) {
                if (parseInt(place.id) == parseInt(current_place) && place.marker.visible === true) {
                    map_obj.openInfoWindow(place);
                }
            });
        },

        place_info: function(place_id) {

            var place_obj;

            $.each(this.places, function(index, place) {

                if (parseInt(place.id) == parseInt(place_id)) {
                    place_obj = place;
                }
            });

            return place_obj;
        },

        event_listener: function(obj, type, func) {
            google.maps.event.addListener(obj, type, func);
        },

        set_visual_refresh: function() {

            google.maps.visualRefresh = true;
        },

        set_45_imagery: function() {
            this.map.setTilt(45);
        },

        set_bicyle_layer: function() {

            var bikeLayer = new google.maps.BicyclingLayer();
            bikeLayer.setMap(this.map);
        },

        set_traffic_layer: function() {

            var traffic_layer = new google.maps.TrafficLayer();
            traffic_layer.setMap(this.map);
        },

        set_panoramic_layer: function() {

            var panoramic_layer = new google.maps.panoramio.PanoramioLayer();
            panoramic_layer.setMap(this.map);
        },

        set_transit_layer: function() {

            var transit_layer = new google.maps.TransitLayer();
            transit_layer.setMap(this.map);
        },

        set_streetview: function(latlng) {

            var panoOptions = {
                position: latlng,
                addressControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_CENTER
                },
                linksControl: this.map_data.street_view.links_control,
                panControl: this.map_data.street_view.street_view_pan_control,
                zoomControlOptions: {
                    style: google.maps.ZoomControlStyle.SMALL
                },
                enableCloseButton: this.map_data.street_view.street_view_close_button
            };
            if (this.map_data.street_view.pov_heading && this.map_data.street_view.pov_pitch) {
                panoOptions['pov'] = {
                    heading: parseInt(this.map_data.street_view.pov_heading),
                    pitch: parseInt(this.map_data.street_view.pov_pitch)
                };
            }
            var panorama = new google.maps.StreetViewPanorama(this.element, panoOptions);
        },

        sortByPlace: function(order_by, data_type) {

            return function(a, b) {

                if (b[order_by] && a[order_by]) {

                    if (a[order_by] && b[order_by]) {
                        var a_val = a[order_by].toLowerCase();
                        var b_val = b[order_by].toLowerCase();
                        if (data_type == 'num') {
                            a_val = parseInt(a_val);
                            b_val = parseInt(b_val);
                        }
                        return ((a_val < b_val) ? -1 : ((a_val > b_val) ? 1 : 0));
                    }

                }
            }

        },

        sort_object_by_keyvalue: function(options, by, type, in_order) {

            var sortable = [];
            for (var key in options) {
                sortable.push(options[key]);
            }

            sortable.sort(this.sortByPlace(by, type));

            if (in_order == 'desc') {
                sortable.reverse();
            }

            return sortable;
        },

        create_filters: function() {
            var map_obj = this;
            var options = '';
            var filters = {};
            var places = this.map_data.places;
            var wpgmp_listing_filter = this.map_data.listing;

            $.each(places, function(index, place) {
                if (typeof place.categories == 'undefined') {
                    place.categories = {};
                }

                $.each(place.categories, function(cat_index, category) {
                    if (typeof filters[category.type] == 'undefined') {
                        filters[category.type] = {};
                    }

                    if (category.name) {
                        if (category.extension_fields && category.extension_fields.cat_order) {

                            filters[category.type][category.name] = {
                                'id': category.id,
                                'order': category.extension_fields.cat_order,
                                'name': category.name
                            };
                        } else {
                            filters[category.type][category.name] = {
                                'id': category.id,
                                'order': 0,
                                'name': category.name
                            };
                        }
                    }

                });
            });
            // now create select boxes

            var content = '',
                by = 'name',
                type = '',
                inorder = 'asc';

            if (map_obj.map_data.listing) {
                if (map_obj.map_data.listing.default_sorting) {
                    if (map_obj.map_data.listing.default_sorting.orderby == 'listorder') {
                        by = 'order';
                        type = 'num';
                        inorder = map_obj.map_data.listing.default_sorting.inorder;
                    }
                    inorder = map_obj.map_data.listing.default_sorting.inorder;
                }
            }

            $.each(filters, function(index, options) {
                //console.log(wpgmp_local.show_locations);
                if (wpgmp_listing_filter.display_category_filter === true && index == "category") {
                    content += '<select data-filter="dropdown" data-name="category" name="place_' + index + '">';
                    content += '<option value="">' + wpgmp_local.select_category + '</option>';
                    options = map_obj.sort_object_by_keyvalue(options, by, type, inorder);
                    $.each(options, function(name, value) {
                        content += "<option value='" + value.id + "'>" + value.name + "</option>";
                    });
                    content += '</select>';

                }

            });

            return content;
        },

        update_filters: function() {
            var map_obj = this;
            var filters = {};

            var all_dropdowns = $(map_obj.container).find('[data-filter="dropdown"]');
            var all_checkboxes = $(map_obj.container).find('[data-filter="checklist"]:checked');
            var all_list = $(map_obj.container).find('[data-filter="list"].fc_selected');

            $.each(all_dropdowns, function(index, element) {
                if ($(this).val() != '') {

                    if (typeof filters[$(this).data('name')] == 'undefined') {
                        filters[$(this).data('name')] = [];
                    }

                    filters[$(this).data('name')].push($(this).val());
                }

            });

            $.each(all_checkboxes, function(index, element) {

                if (typeof filters[$(this).data('name')] == 'undefined') {
                    filters[$(this).data('name')] = [];
                }

                filters[$(this).data('name')].push($(this).val());

            });

            $.each(all_list, function(index, element) {

                if (typeof filters[$(this).data('name')] == 'undefined') {
                    filters[$(this).data('name')] = [];
                }

                filters[$(this).data('name')].push($(this).data('value').toString());

            });
            this.apply_filters(filters);

        },

        apply_filters: function(filters) {

            var map_obj = this;
            var showAll = true;
            var show = true;
            map_obj.show_places = [];

            var enable_search_term = false;
            // Filter by search box.
            if ($(map_obj.container).find('[data-input="wpgmp-search-text"]').length > 0) {
                var search_term = $(map_obj.container).find('[data-input="wpgmp-search-text"]').val();
                search_term = search_term.toLowerCase();
                if (search_term.length > 0) {
                    enable_search_term = true;
                }
            }

            if (((map_obj.map_data.map_tabs && map_obj.map_data.map_tabs.category_tab && map_obj.map_data.map_tabs.category_tab.cat_tab === true) || $(map_obj.container).find('input[data-marker-category]').length > 0)) {
                var all_selected_category_sel = $(map_obj.container).find('input[data-marker-category]:checked');
                var all_selected_category = [];
                var all_not_selected_location = [];
                if (all_selected_category_sel.length > 0) {
                    $.each(all_selected_category_sel, function(index, selected_category) {
                        all_selected_category.push($(selected_category).data("marker-category"));
                        var all_not_selected_location_sel = $(selected_category).closest('[data-container="wpgmp-category-tab-item"]').find('input[data-marker-location]:not(:checked)');
                        if (all_not_selected_location_sel.length > 0) {
                            $.each(all_not_selected_location_sel, function(index, not_selected_location) {
                                all_not_selected_location.push($(not_selected_location).data("marker-location"));
                            });
                        }
                    });
                }
                var all_selected_location_sel = $(map_obj.container).find('[data-container="wpgmp-category-tab-item"]').find('input[data-marker-location]:checked');
                var all_selected_location = [];
                if (all_selected_location_sel.length > 0) {
                    $.each(all_selected_location_sel, function(index, selected_location) {
                        all_selected_location.push($(selected_location).data("marker-location"));
                    });
                }
            }



            if (typeof map_obj.map_data.places != 'undefined') {
                $.each(map_obj.map_data.places, function(place_key, place) {

                    show = true;

                    if (typeof filters != 'undefined') {
                        $.each(filters, function(filter_key, filter_values) {

                            var in_fields = false;

                            if ($.isArray(filter_values)) {

                                if (typeof place.categories != 'undefined' && filter_key == "category") {

                                    $.each(place.categories, function(cat_index, category) {
                                        if ($.inArray(category.id, filter_values) > -1) {
                                            in_fields = true;
                                        }
                                    });
                                }

                                if (typeof place[filter_key] != 'undefined') {
                                    if ($.inArray(place[filter_key], filter_values) > -1) {
                                        in_fields = true;
                                    }
                                } else if (typeof place.location[filter_key] != 'undefined') {
                                    if ($.inArray(place.location[filter_key], filter_values) > -1) {
                                        in_fields = true;

                                    }
                                } else if (place.location.extra_fields && typeof place.location.extra_fields[filter_key] != 'undefined') {

                                    var dropdown_value = filter_values[0];
                                    if (place.location.extra_fields[filter_key] && place.location.extra_fields[filter_key].indexOf(dropdown_value) > -1) {
                                        in_fields = true;
                                    } else if ($.inArray(place.location.extra_fields[filter_key], filter_values) > -1) {
                                        in_fields = true;
                                    }

                                }

                                if (in_fields == false)
                                    show = false;

                            } else {
                                filter_values.val = "";
                            }
                        });
                    }

                    //Apply Search Filter.
                    if (enable_search_term === true && show === true) {

                        if (place.title != undefined && place.title.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;

                        } else if (place.content != undefined && place.content.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;

                        } else if (place.location.lat.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;

                        } else if (place.location.lng.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;

                        } else if (place.address && place.address.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;
                        } else if (place.location.state && place.location.state.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;

                        } else if (place.location.country && place.location.country.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;

                        } else if (place.location.postal_code && place.location.postal_code.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;

                        } else if (place.location.city && place.location.city.toLowerCase().indexOf(search_term) >= 0) {
                            show = true;
                        } else if (typeof map_obj.search_area != 'undefined' && map_obj.search_area != '' && map_obj.wpgmp_within_radius(place, map_obj.search_area) === true) {
                            show = true;
                        } else {
                            show = false;
                        }

                        if (typeof place.location.extra_fields != 'undefined') {
                            $.each(place.location.extra_fields, function(field, value) {

                                if (value) {
                                    value = value.toString();
                                    if (value && value.toLowerCase().indexOf(search_term) >= 0)
                                        show = true;
                                }


                            });
                        }

                    }

                    //Exclude locations without category if location filters are choosed by user
                    if ((place.categories.length == undefined || place.categories.length == 'undefined') && all_selected_category && (all_selected_category.length > 0) && ($(map_obj.container).find('input[name="wpgmp_select_all"]').is(":checked") == false) && show) {
                        show = false;
                    }

                    // if checked category
                    if (all_selected_category && show != false && place.categories.length != undefined) {

                        var in_checked_category = false;

                        if (all_selected_category.length === 0) {
                            // means no any category selected so show those location without categories.
                            if (typeof place.categories != 'undefined') {
                                $.each(place.categories, function(cat_index, category) {
                                    if (category.id === '')
                                        in_checked_category = true;
                                });
                            }
                        } else {
                            if (typeof place.categories != 'undefined') {
                                $.each(place.categories, function(cat_index, category) {
                                    if (category.id === '')
                                        in_checked_category = true;
                                    else if ($.inArray(parseInt(category.id), all_selected_category) > -1) {
                                        in_checked_category = true;
                                        place.marker.setIcon(category.icon);
                                    }

                                });
                            }
                        }

                        //Hide unchecked  locations.
                        if (all_not_selected_location.length !== 0) {
                            if ($.inArray(parseInt(place.id), all_not_selected_location) > -1) {
                                in_checked_category = false;
                            }
                        }

                        //var checked_categories = $(map_obj.container).find('input[data-marker-category]:checked').length;
                        if (in_checked_category === false)
                            show = false;
                        else
                            show = true;



                        //Show Here checked location.
                        if (all_selected_location.length !== 0) {
                            if ($.inArray(parseInt(place.id), all_selected_location) > -1) {
                                show = true;
                            }
                        }

                    }


                    place.marker.visible = show;
                    place.marker.setVisible(show);
                    if (show == false) {
                        place.infowindow.close();
                    }
                    place.marker.setAnimation(null);
                    if (show === true)
                        map_obj.show_places.push(place);
                });
            }


            if (typeof map_obj.map_data.map_options.bound_map_after_filter !== typeof undefined &&
                map_obj.map_data.map_options.bound_map_after_filter === true) {

                var after_filter_bounds = new google.maps.LatLngBounds();

                for (var j = 0; j < map_obj.show_places.length; j++) {
                    var markerInResult = new google.maps.LatLng(map_obj.show_places[j]['location']['lat'], map_obj.show_places[j]['location']['lng']);
                    after_filter_bounds.extend(markerInResult);
                }

                map_obj.map.fitBounds(after_filter_bounds);

            }

            if (map_obj.map_data.listing) {

                if ($(map_obj.container).find('[data-filter="map-sorting"]').val()) {
                    var order_data = $(map_obj.container).find('[data-filter="map-sorting"]').val().split("__");
                    var data_type = '';
                    if (order_data[0] !== '' && order_data[1] !== '') {

                        if (typeof order_data[2] != 'undefined') {
                            data_type = order_data[2];
                        }
                        map_obj.sorting(order_data[0], order_data[1], data_type);
                    }
                } else {
                    if (map_obj.map_data.listing.default_sorting) {
                        var data_type = '';
                        if (map_obj.map_data.listing.default_sorting.orderby == 'listorder') {
                            data_type = 'num';
                        }
                        map_obj.sorting(map_obj.map_data.listing.default_sorting.orderby, map_obj.map_data.listing.default_sorting.inorder, data_type);
                    }
                }

            }

            if (map_obj.map_data.marker_cluster) {
                map_obj.set_marker_cluster();
            }

        },

        display_filters_listing: function() {

            if (this.map_data.listing) {

                var filter_content = '<div class="wpgmp_filter_wrappers">' + this.display_filters() + '</div>';
                $(this.container).find(".wpgmp_map_parent").after(filter_content);

            }

        },

        display_filters: function() {

            var hide_locations = this.map_data.listing.hide_locations;

            var content = '';
            content += '<div class="wpgmp_before_listing">' + this.map_data.listing.listing_header + '</div>';

            content += '<div class="categories_filter">' + this.create_filters() + '<div data-container="wpgmp-filters-container"></div>';
            content += '</div>';

            return content;
        },

        map_loaded: function() {

            var map_obj = this;

            var gmap = map_obj.map;

            google.maps.event.addListenerOnce(gmap, 'idle', function() {

                var center = gmap.getCenter();
                google.maps.event.trigger(gmap, 'resize');
                gmap.setCenter(center);

            });

            if (map_obj.settings.center_by_nearest === true) {
                map_obj.center_by_nearest();
            }
            if (map_obj.settings.close_infowindow_on_map_click === true) {
                google.maps.event.addListener(gmap, "click", function(event) {
                    $.each(map_obj.places, function(key, place) {
                        place.infowindow.close();
                        place.marker.setAnimation(null);
                    });
                });
            }

            if (map_obj.settings.map_infowindow_customisations === true) {
                google.maps.event.addListener(map_obj.infowindow_marker, 'domready', function() {

                    var wpgmp_iwOuter = $(map_obj.container).find('.gm-style-iw');

                    wpgmp_iwOuter.parent().css({
                        'width': '0px',
                        'height': '0px'
                    });
                    var wpgmp_iwCloseBtn = wpgmp_iwOuter.next();
                    wpgmp_iwCloseBtn.css('display', 'none');

                    var wpgmp_iwBackground = wpgmp_iwOuter.prev();

                    wpgmp_iwBackground.children(':nth-child(2)').css({
                        'display': 'none'
                    });

                    wpgmp_iwBackground.children(':nth-child(3)').css({
                        'background-color': '#000;',
                    });

                    wpgmp_iwBackground.children(':nth-child(4)').css({
                        'display': 'none'
                    });
                    var height = wpgmp_iwOuter.outerHeight();
                    wpgmp_iwBackground.children(':nth-child(3)').css({
                        'top': (height + 18) + 'px'
                    });
                    wpgmp_iwBackground.children(':nth-child(1)').css({
                        'top': (height + 10) + 'px'
                    });
                    wpgmp_iwBackground.children(':nth-child(3)').find('div').children().css({
                        'box-shadow': map_obj.settings.infowindow_border_color + ' 0px 1px 6px',
                        'border': '1px solid ' + map_obj.settings.infowindow_border_color,
                        'border-top': '',
                        'z-index': '1',
                        'background-color': map_obj.settings.infowindow_bg_color
                    });
                    wpgmp_iwOuter.find('.wpgmp_infowindow').prepend('<div class="infowindow-close"></div>');
                    wpgmp_iwOuter.on('click', '.infowindow-close', function(event) {
                        $.each(map_obj.places, function(key, place) {
                            place.infowindow.close();
                            place.marker.setAnimation(null);
                        });
                    });
                });
            }

        },

        resize_map: function() {
            var map_obj = this;
            var gmap = map_obj.map;
            var zoom = gmap.getZoom();
            var center = gmap.getCenter();
            google.maps.event.trigger(this.map, 'resize');
            gmap.setZoom(zoom);
            gmap.setCenter(center);
        },
        responsive_map: function() {

            var map_obj = this;

            var gmap = map_obj.map;

            google.maps.event.addDomListener(window, "resize", function() {

                var zoom = gmap.getZoom();
                var center = gmap.getCenter();

                google.maps.event.trigger(gmap, "resize");
                gmap.setZoom(zoom);
                gmap.setCenter(center);
                gmap.getBounds();

            });

        },


        show_search_control: function() {
            var map_obj = this;
            var input = $(map_obj.container).find('[data-input="map-search-control"]')[0];

            if (input !== undefined) {
                var searchBox = new google.maps.places.Autocomplete(input);

                if (wpgmp_local.wpgmp_country_specific && wpgmp_local.wpgmp_country_specific == true) {
                    searchBox.setComponentRestrictions({
                        'country': wpgmp_local.wpgmp_countries
                    });
                }

                map_obj.map.controls[eval("google.maps.ControlPosition." + map_obj.settings.search_control_position)].push(input);
                searchBox.bindTo('bounds', map_obj.map);
                google.maps.event.addListener(searchBox, 'place_changed', function() {
                    var place = searchBox.getPlace();
                    map_obj.map.setCenter(place.geometry.location);
                    map_obj.map.setZoom(parseInt(map_obj.map_data.map_options.map_zoom_after_search));
                });
            }
        },

        fit_bounds: function() {
            var map_obj = this;
            var places = map_obj.map_data.places;
            var bounds = new google.maps.LatLngBounds();

            if (places !== undefined) {
                places.forEach(function(place) {

                    if (place.location.lat && place.location.lng) {
                        bounds.extend(new google.maps.LatLng(
                            parseFloat(place.location.lat),
                            parseFloat(place.location.lng)
                        ));
                    }

                });
            }
            map_obj.map.fitBounds(bounds);

        },

        create_markers: function() {

            var map_obj = this;
            var places = map_obj.map_data.places;
            var temp_listing_placeholder;
            var replaceData;
            var remove_keys = [];

            $.each(places, function(key, place) {

                if (place.location.lat && place.location.lng) {
                    if (typeof place.categories == 'undefined') {
                        place.categories = {};
                    }
                    place.marker = new google.maps.Marker({
                        position: new google.maps.LatLng(
                            parseFloat(place.location.lat),
                            parseFloat(place.location.lng)
                        ),
                        icon: place.location.icon,
                        url: place.url,
                        draggable: place.location.draggable,
                        map: map_obj.map,
                        clickable: place.location.infowindow_disable,
                    });

                    if (map_obj.settings.infowindow_drop_animation === true) {
                        place.marker.setAnimation(google.maps.Animation.DROP);
                    }

                    if (map_obj.settings.infowindow_filter_only === true) {
                        place.marker.visible = false;
                        place.marker.setVisible(false);
                    }


                    // bind event to marker
                    if (map_obj.map_data.page == 'edit_location')
                        map_obj.marker_bind(place.marker);
                    var location_categories = [];
                    if (typeof place.categories != 'undefined') {
                        for (var cat in place.categories) {
                            location_categories.push(place.categories[cat].name);
                        }
                    }
                    var content = '';
                    // replace infowindow content.
                    var marker_image = '';

                    if (place.source == 'post') {
                        marker_image = place.location.extra_fields.post_featured_image;
                    } else {
                        marker_image = place.location.marker_image;
                    }

                    var temp_listing_placeholder = '';
                    if (place.source == 'post') {
                        temp_listing_placeholder = map_obj.settings.infowindow_geotags_setting;
                    } else {
                        temp_listing_placeholder = map_obj.settings.infowindow_setting;
                    }

                    if (typeof temp_listing_placeholder == 'undefined') {
                        temp_listing_placeholder = place.content;
                    }

                    replaceData = {
                        "{marker_id}": place.id,
                        "{marker_title}": place.title,
                        "{marker_address}": place.address,
                        "{marker_latitude}": place.location.lat,
                        "{marker_longitude}": place.location.lng,
                        "{marker_city}": place.location.city,
                        "{marker_state}": place.location.state,
                        "{marker_country}": place.location.country,
                        "{marker_postal_code}": place.location.postal_code,
                        "{marker_zoom}": place.location.zoom,
                        "{marker_icon}": place.location.icon,
                        "{marker_category}": location_categories.join(','),
                        "{marker_message}": place.content,
                        "{marker_image}": marker_image
                    };

                    //Add extra fields of locations
                    if (typeof place.location.extra_fields != 'undefined') {
                        for (var extra in place.location.extra_fields) {
                            if (!place.location.extra_fields[extra]) {
                                replaceData['{' + extra + '}'] = '';
                            } else {
                                replaceData['{' + extra + '}'] = place.location.extra_fields[extra];
                            }
                        }
                    }
                    temp_listing_placeholder = temp_listing_placeholder.replace(/{[^{}]+}/g, function(match) {
                        if (match in replaceData) {
                            return (replaceData[match]);
                        } else {
                            return ("");
                        }
                    });

                    content = temp_listing_placeholder;


                    if (content === "") {
                        if (map_obj.settings.map_infowindow_customisations === true && map_obj.settings.show_infowindow_header === true)
                            content = '<div class="wpgmp_infowindow"><div class="wpgmp_iw_head"><div class="wpgmp_iw_head_content">' + place.title + '</div></div><div class="wpgmp_iw_content">' + place.content + '</div></div>';
                        else
                            content = '<div class="wpgmp_infowindow"><div class="wpgmp_iw_content">' + place.content + '</div></div>';
                    } else {
                        if (map_obj.settings.map_infowindow_customisations === true && map_obj.settings.show_infowindow_header === true)
                            content = '<div class="wpgmp_infowindow"><div class="wpgmp_iw_head"><div class="wpgmp_iw_head_content">' + place.title + '</div></div><div class="wpgmp_iw_content">' + content + '</div></div>';
                        else
                            content = '<div class="wpgmp_infowindow"><div class="wpgmp_iw_content">' + content + '</div></div>';

                    }
                    place.infowindow_data = content;
                    place.infowindow = map_obj.infowindow_marker;

                    if (place.location.infowindow_default_open === true) {
                        map_obj.openInfoWindow(place);
                    } else if (map_obj.settings.default_infowindow_open === true) {
                        map_obj.openInfoWindow(place);
                    }
                    var on_event = map_obj.settings.infowindow_open_event;
                    var bounce_on_event = map_obj.settings.infowindow_bounce_animation;
                    map_obj.event_listener(place.marker, on_event, function() {
                        $.each(map_obj.places, function(key, prev_place) {
                            prev_place.infowindow.close();
                            prev_place.marker.setAnimation(null);
                        });
                        map_obj.openInfoWindow(place);
                        if (bounce_on_event == 'click') {
                            map_obj.toggle_bounce(place.marker);
                        }
                    });
                    if (bounce_on_event == 'mouseover' && on_event != 'mouseover') {
                        map_obj.event_listener(place.marker, 'mouseover', function() {
                            place.marker.setAnimation(google.maps.Animation.BOUNCE);
                        });

                        map_obj.event_listener(place.marker, 'mouseout', function() {
                            place.marker.setAnimation(null);
                        });
                    }

                    if (bounce_on_event != '') {
                        google.maps.event.addListener(place.infowindow, 'closeclick', function() {
                            place.marker.setAnimation(null);
                        });
                    }

                    map_obj.places.push(place);
                } else {
                    remove_keys.push(key);
                }
            });
            $.each(remove_keys, function(index, value) {
                places.splice(value, 1);
            });

        },

        toggle_bounce: function(marker) {
            if (marker.getAnimation() !== null) {
                marker.setAnimation(null);
            } else {
                marker.setAnimation(google.maps.Animation.BOUNCE);
            }
        },
        display_markers: function() {

            var map_obj = this;
            map_obj.show_places = [];
            map_obj.categories = [];
            var categories = {};
            for (var i = 0; i < map_obj.places.length; i++) {
                map_obj.places[i].marker.setMap(map_obj.map);
                if (map_obj.places[i].marker.visible === true) {
                    map_obj.show_places.push(this.places[i]);
                }

                if (typeof map_obj.places[i].categories != 'undefined') {
                    $.each(map_obj.places[i].categories, function(index, category) {

                        if (typeof categories[category.name] == 'undefined') {
                            categories[category.name] = category;
                        }
                    });
                }
            }

            this.categories = categories;
        },

        get_current_location: function(success_func, error_func) {

            var map = this;

            if (typeof map.user_location == 'undefined') {

                navigator.geolocation.getCurrentPosition(function(position) {
                    map.user_location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                    if (success_func)
                        success_func(map.user_location);

                }, function(ErrorPosition) {

                    if (error_func)
                        error_func(ErrorPosition);

                }, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            } else {
                if (success_func)
                    success_func(map.user_location);
            }
        },

        openInfoWindow: function(place) {
            var map_obj = this;
            place.infowindow = map_obj.infowindow_marker;
            place.infowindow.setContent(place.infowindow_data);
            if (place.location.onclick_action == "custom_link") {
                if (place.location.open_new_tab == 'yes')
                    window.open(place.location.redirect_custom_link, '_blank');
                else
                    window.open(place.location.redirect_custom_link, '_self');
            } else {
                place.infowindow.open(this.map, place.marker);
                if (typeof map_obj.settings.infowindow_click_change_center != 'undefined' && map_obj.settings.infowindow_click_change_center == true) {
                    map_obj.map.setCenter(place.marker.getPosition());
                }
                if (typeof map_obj.settings.infowindow_click_change_zoom != 'undefined' && map_obj.settings.infowindow_click_change_zoom > 0) {
                    map_obj.map.setZoom(map_obj.settings.infowindow_click_change_zoom);
                }
                if (this.map_data.map_tabs && this.map_data.map_tabs.direction_tab && this.map_data.map_tabs.direction_tab.dir_tab === true) {
                    $(this.container).find('.start_point').val(place.address);
                }
            }

        },
    };

    $.fn.maps = function(options, places) {

        this.each(function() {

            if (!$.data(this, "wpgmp_maps")) {
                $.data(this, "wpgmp_maps", new GoogleMaps(this, options, places));
            }

        });
        // chain jQuery functions
        return this;
    };

}(jQuery, window, document));