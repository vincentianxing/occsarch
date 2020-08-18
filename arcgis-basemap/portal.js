require(['esri/Map', 'esri/views/MapView', 'esri/portal/Portal'], function (
  Map,
  Portal
) {
  portal = new Portal();
  // Setting authMode to immediate signs the user in once loaded
  portal.authMode = 'immediate';

  // Once portal is loaded, user signed in
  portal.load().then(function () {
    console.log(portal);
  });
});
