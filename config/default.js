const website = 'https://www.kalisio.com'
const onlineHelp = 'https://kalisio.github.io/aktnmap'

const serverPort = process.env.PORT || process.env.HTTPS_PORT || 8081
// Required to know webpack port so that in dev we can build correct URLs
const clientPort = process.env.CLIENT_PORT || process.env.HTTPS_CLIENT_PORT || 8080
const API_PREFIX = '/api'
let domain, weacastApi
let stripeKey
// If we build a specific staging instance
if (process.env.NODE_APP_INSTANCE === 'dev') {
  domain = 'https://aktnmap.dev.kalisio.xyz'
} else if (process.env.NODE_APP_INSTANCE === 'test') {
  domain = 'https://aktnmap.test.kalisio.xyz'
} else if (process.env.NODE_APP_INSTANCE === 'prod') {
  domain = 'https://aktnmap.prod.kalisio.com'
} else {
  // Otherwise we are on a developer machine
  if (process.env.NODE_ENV === 'development') {
    domain = 'http://localhost:' + clientPort // Akt'n'Map app client/server port = 8080/8081
    weacastApi = 'http://localhost:' + (Number(clientPort)+2) // Weacast app client/server port = 8082/8083
  } else {
    domain = 'http://localhost:' + serverPort // Akt'n'Map app client/server port = 8081
    weacastApi = 'http://localhost:' + (Number(serverPort)+1) // Weacast app client/server port = 8082
  }
}
// Override defaults if env provided
if (process.env.SUBDOMAIN) {
  domain = 'https://aktnmap.' + process.env.SUBDOMAIN
}
// On a developer machine will do domain = gateway = localhost
const gateway = domain.replace('aktnmap', 'api')

const contextHelp = function (tour) {
  return Object.assign({
    id: 'contextual-help', icon: 'las la-question-circle', label: 'leftPane.CONTEXTUAL_HELP', renderer: 'item'
  }, tour ? { handler: { name: 'launchTour', params: [tour] } } : { handler: 'launchTour' })
}

const leftPane = function (tour) {
  return {
    content: [
      { component: 'QImg', src: 'statics/aktnmap-banner.png' },
      { component: 'account/KIdentityPanel', class: 'full-width' },
      { id: 'organisations', icon: 'las la-grip-horizontal', label: 'leftPane.ORGANISATIONS', route: { name: 'organisations-activity' }, renderer: 'item' },
      { component: 'QSeparator', color: 'lightgrey', style: 'min-height: 1px; max-height: 1px;' },
      { component: 'Settings' },
      { component: 'QSeparator', color: 'lightgrey', style: 'min-height: 1px; max-height: 1px;' },
      { component: 'layout/KAbout' },
      { id: 'online-help', icon: 'las la-book', label: 'leftPane.ONLINE_HELP', url: onlineHelp, renderer: 'item' },
      contextHelp(tour),
      { component: 'QSeparator', color: 'lightgrey', style: 'min-height: 1px; max-height: 1px;' },
      { id: 'logout', icon: 'las la-sign-out-alt', label: 'leftPane.LOGOUT', route: { name: 'logout' }, renderer: 'item' }
    ]
  }
}

const separator = { component: 'QSeparator', vertical: true, color: 'lightgrey' }
const midSeparator = { component: 'QSeparator', vertical: true, inset: true, color: 'grey-5', style: 'max-width: 1px; min-width: 2px;' }

let defaultMapOptions = {
  viewer: {
    minZoom: 3,
    maxZoom: 19,
    center: [47, 3],
    zoom: 6,
    maxBounds: [ [-90, -180], [90, 180] ],
    maxBoundsViscosity: 0.25
  },
  // Default GeoJSON layer style for polygons/lines
  featureStyle: {
    'stroke-opacity': 1,
    'stroke-color': 'red',
    'stroke-width': 3,
    'fill-opacity': 0.5,
    'fill-color': 'green'
  },
  // Default GeoJSON layer style for polygons/lines edition
  editFeatureStyle: {
    'stroke-opacity': 1,
    'stroke-color': 'red',
    'stroke-width': 3,
    'fill-opacity': 0.5,
    'fill-color': 'green'
  },
  // Default GeoJSON layer style for points
  pointStyle: {
    'icon-color': '#FFFFFF',
    'marker-color': '#2196f3',
    'icon-classes': 'fas fa-circle'
  },
  // Default GeoJSON layer style for points edition
  editPointStyle: {
    'marker-type': 'circleMarker',
    radius: 6,
    'stroke-color': 'red',
    'stroke-opacity': 1,
    'fill-opacity': 0.5,
    'fill-color': 'green'
  },
  // Default GeoJSON infobox will display all properties
  popup: { pick: [] },
  infobox: {},
  cluster: { disableClusteringAtZoom: 18 },
  fileLayers: {
    fileSizeLimit : 1024 * 1024,
    formats: [ '.geojson', '.kml', '.gpx' ]
  }
}

const businessLayers = {
  name: 'KCatalogPanel.BUSINESS_LAYERS',
  icon: 'las la-briefcase',
  options: { exclusive: false, filter: { type: 'OverlayLayer', tags: { $in: ['business'] } } }
}
const baseLayers = {
  name: 'KCatalogPanel.BASE_LAYERS',
  icon: 'las la-layer-group',
  options: { exclusive: true, filter: { type: 'BaseLayer' } }
}
const capturedLayers = {
  name: 'KCatalogPanel.CAPTURED_LAYERS',
  icon: 'las la-street-view',
  options: { exclusive: false, filter: { type: 'OverlayLayer', tags: { $in: ['captured'] } } }
}
const measureLayers = {
  name: 'KCatalogPanel.MEASURE_LAYERS',
  icon: 'las la-map-pin',
  options: { exclusive: false, filter: { type: 'OverlayLayer', tags: { $in: ['measure'] } } }
}
const meteoLayers = {
  name: 'KCatalogPanel.METEO_LAYERS',
  icon: 'las la-cloud-sun-rain',
  component: 'catalog/KWeatherLayersSelector',
  options: { exclusive: true, filter: { type: 'OverlayLayer', tags: { $in: ['weather'] } } }
}

const defaultMapCatalog = {
  categories: [
    businessLayers,
    baseLayers,
    capturedLayers,
    measureLayers,
    meteoLayers
  ]
}

const widgets = [
  { id: 'information-box', icon: 'las la-digital-tachograph', component: 'widget/KInformationBox', bind: '$data.selection' },
  { id: 'time-series', icon: 'las la-chart-line', component: 'widget/KTimeSeries', bind: '$data' },
  { id: 'mapillary-viewer', icon: 'kdk:mapillary.png', component: 'widget/KMapillaryViewer' }
]

const contextFilter = function (field, services = []) {
  return [
    { id: 'back', icon: 'las la-arrow-left', handler: { name: 'setTopPaneMode', params: ['default'] } },
    { component: 'QSeparator', vertical: true,  color: 'lightgrey' },
    { 
      component: 'collection/KFilter', field, services
    }
  ]
}

/*const contextMenu = function (activityName) {
  return {
    id: 'app-bar-overflow-menu',
    component: 'frame/KMenu',
    icon: 'las la-grip-horizontal',
    actionRenderer: 'item',
    content: [
      { 
        id: 'members', icon: 'las la-user-friends', label: 'KMembersActivity.MEMBERS_LABEL',
        visible: { name: '$can', params: ['service', 'members', ':contextId'] },
        route: { name: 'members-activity', params: { contextId: ':contextId' } },    
      },
      { 
        id: 'tags', icon: 'las la-tags', label: 'KTagsActivity.TAGS_LABEL',
        visible: { name: '$can', params: ['service', 'tags', ':contextId'] },
        route: { name: 'tags-activity', params: { contextId: ':contextId' } },    
      },
      { 
        id: 'groups', icon: 'las la-sitemap', label: 'KGroupsActivity.GROUPS_LABEL',
        visible: { name: '$can', params: ['service', 'groups', ':contextId'] },
        route: { name: 'groups-activity', params: { contextId: ':contextId' } },    
      },
      { 
        id: 'event-templates', icon: 'las la-project-diagram', label: 'EventTemplatesActivity.EVENT_TEMPLATES_LABEL',
        visible: { name: '$can', params: ['service', 'event-templates', ':contextId'] },
        route: { name: 'event-templates-activity', params: { contextId: ':contextId' } },    
      },
      { 
        id: 'settings', icon: 'las la-cog', label: 'Context.SETTINGS',
        visible: { name: '$can', params: ['update', 'organisations', null, { _id: ':contextId' }] },
        route: { name: 'organisation-settings-activity', params: { page: 'properties', contextId: ':contextId' } },    
      },
      { 
        id: 'refresh', icon: 'las la-sync', label: 'Context.REFRESH', handler: 'refresh'
      }
    ].filter(item => !item.route || (item.route.name !== activityName))
  }
}
*/

const layerActions = [{
  id: 'layer-actions',
  component: 'frame/KMenu',
  actionRenderer: 'item',
  content: [
    { id: 'zoom-to', label: 'mixins.activity.ZOOM_TO_LABEL', icon: 'las la-search-location', handler: 'onZoomToLayer' },
    { id: 'save', label: 'mixins.activity.SAVE_LABEL', icon: 'las la-save', handler: 'onSaveLayer', visible: 'isLayerStorable' },
    { id: 'filter-data', label: 'mixins.activity.FILTER_DATA_LABEL', icon: 'las la-filter', handler: 'onFilterLayerData', visible: 'isFeatureLayer' },
    { id: 'view-data', label: 'mixins.activity.VIEW_DATA_LABEL', icon: 'las la-th-list', handler: 'onViewLayerData', visible: 'isFeatureLayer' },
    { id: 'chart-data', label: 'mixins.activity.CHART_DATA_LABEL', icon: 'las la-chart-pie', handler: 'onChartLayerData', visible: 'isFeatureLayer' },
    { id: 'edit', label: 'mixins.activity.EDIT_LABEL', icon: 'las la-file-alt', handler: 'onEditLayer', visible: 'isLayerEditable' },
    { id: 'edit-style', label: 'mixins.activity.EDIT_LAYER_STYLE_LABEL', icon: 'las la-border-style', handler: 'onEditLayerStyle', visible: 'isLayerStyleEditable' },
    { id: 'edit-data', label: 'mixins.activity.START_EDIT_DATA_LABEL', icon: 'las la-edit', handler: 'onEditLayerData', visible: 'isLayerDataEditable',
      toggle: { icon: 'las la-edit', tooltip: 'mixins.activity.STOP_EDIT_DATA_LABEL' }, component: 'KEditLayerData' },
    { id: 'remove', label: 'mixins.activity.REMOVE_LABEL', icon: 'las la-minus-circle', handler: 'onRemoveLayer', visible: 'isLayerRemovable' }
  ]
}]

module.exports = {
  // Special alias to host loopback interface in cordova
  //domain: 'http://10.0.2.2:8081',
  // If using port forwarding
  //domain: 'http://localhost:8081',
  // If using local IP on WiFi router
  //domain: 'http://192.168.1.16:8081',
  domain,
  flavor: process.env.NODE_APP_INSTANCE || 'dev',
  version: require('../package.json').version,
  buildNumber: process.env.BUILD_NUMBER,
  apiPath: API_PREFIX,
  apiJwt: 'aktnmap-jwt',
  apiTimeout: 20000,
  transport: 'websocket', // Could be 'http' or 'websocket',
  gateway,
  gatewayJwtField: 'jwt',
  gatewayJwt: 'aktnmap-gateway-jwt',
  appName: 'Akt\'n\'Map',
  appLogo: 'aktnmap-logo.png',
  appWebsite: 'https://kalisio.com/solutions#aktnmap',
  appOnlineHelp: onlineHelp,
  publisher: 'Kalisio',
  publisherWebsite: website,
  logs: {
    level: (process.env.NODE_ENV === 'development' ? 'debug' : 'info')
  },
  stripe: {
    secretKey: process.env.STRIPE_PUBLIC_KEY,
    options: {}
  },
  roles: {
    // Member/Manager/Owner
    labels: ['MEMBER', 'MANAGER', 'OWNER'],
    icons: ['las la-user', 'las la-briefcase', 'las la-certificate']
  },
  context: {
    service: 'organisations'
  },
  screens: {
    banner: 'aktnmap-banner.png',
    extraLinks: [
      { label: 'screen.ABOUT_KALISIO', url: website },
      { label: 'screen.CONTACT', url: website + '/#footer' },
      { label: 'screen.TERMS_AND_POLICIES', url: domain + '/#/terms' },
    ],
    login: {
      /* Removed from default config
      providers: ['google', 'github'],
      */
      links: [
        { id: 'reset-password-link', label: 'KLogin.FORGOT_YOUR_PASSWORD_LINK', route: {name: 'send-reset-password' } },
        { id: 'register-link', label: 'KLogin.DONT_HAVE_AN_ACCOUNT_LINK', route: { name: 'register' } },
        { id: 'contextual-help', label: 'KLogin.CONTEXTUAL_HELP', route: { name: 'login', query: { tour: true } } }
      ]
    },
    logout: {
      links: [
        { id: 'login-link', label: 'KLogout.LOG_IN_AGAIN_LINK', route: { name: 'login' } },
      ]
    },
    register: {
      links: [
        { id: 'login-link', label: 'KRegister.ALREADY_HAVE_AN_ACCOUNT_LINK', route: { name: 'login' } },
        { id: 'contextual-help', label: 'KRegister.CONTEXTUAL_HELP', route: { name: 'register', query: { tour: true } } }
      ]
    },
    changeEndpoint: {
      links: [
        { id: 'login-link', label: 'KChangeEndpoint.LOGIN_LINK', route: { name: 'login' } },
        { id: 'register-link', label: 'KChangeEndpoint.DONT_HAVE_AN_ACCOUNT_LINK', route: { name: 'register' } }
      ]
    }
  },
  layout: {
    view: 'lHh LpR lFf',
    leftPane: {
      opener: true
    },
    topPane: {
      opener: false,
      visible: true
    },
    rightPane: {
      opener: true
    },
    bottomPane: {
      opener: true
    }
  },
  accountActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        profile: [
          { id: 'profile', icon: 'las la-user', color: 'primary', label: 'KAccountActivity.PROFILE', disabled: true },
          { id: 'security', icon: 'las la-shield-alt', tooltip: 'KAccountActivity.SECURITY', route: { name: 'account-activity', params: { page: 'security' } } },
          { id: 'danger-zone', icon: 'las la-exclamation-triangle', tooltip: 'KAccountActivity.DANGER_ZONE', route: { name: 'account-activity', params: { page: 'danger-zone' } } }
        ],
        security: [
          { id: 'profile', icon: 'las la-user', tooltip: 'KAccountActivity.PROFILE', route: { name: 'account-activity', params: { page: 'profile' } } },
          { id: 'security', icon: 'las la-shield-alt', color: 'primary', label: 'KAccountActivity.SECURITY', disabled: true },
          { id: 'danger-zone', icon: 'las la-exclamation-triangle', tooltip: 'KAccountActivity.DANGER_ZONE', route: { name: 'account-activity', params: { page: 'danger-zone' } } }
        ],
        'danger-zone': [
          { id: 'profile', icon: 'las la-user', tooltip: 'KAccountActivity.PROFILE', route: { name: 'account-activity', params: { page: 'profile' } } },
          { id: 'security', icon: 'las la-shield-alt', tooltip: 'KAccountActivity.SECURITY', route: { name: 'account-activity', params: { page: 'security' } } },
          { id: 'danger-zone', icon: 'las la-exclamation-triangle', color: 'primary', label: 'KAccountActivity.DANGER_ZONE', disabled: true }
        ]
      }
    },
    devices: {
      actions: [
        { id: 'remove-device', tooltip: 'KDeviceCard.UNLINK_LABEL', icon: 'phonelink_erase', handler: 'removeDevice',
          visible: { name: '$can', params: ['remove', 'devices', ':contextId', ':item'] } }
      ]
    }
  },
  organisationsActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        'default': [
          { id: 'organisations', icon: 'las la-grip-horizontal', label: 'KOrganisationsActivity.ORGANISATIONS_LABEL', color: 'primary', disabled: true },
          midSeparator,
          { id: 'organisation-sorter', component: 'collection/KSorter', tooltip: 'KOrganisationsActivity.SORT_ORGANISATIONS' },
          { id: 'search-organisation', icon: 'las la-search', tooltip: 'KOrganisationsActivity.SEARCH_ORGANISATIONS', handler: { name: 'setTopPaneMode', params: ['filter'] } }
        ],
        'filter': contextFilter('name')
      }
    },
    fab: {
      actions: [
        { id: 'create-organisation', icon: 'las la-plus', tooltip: 'KOrganisationsActivity.CREATE_ORGANISATION_LABEL', route: { name: 'create-organisation' } }
      ]
    },
    items: {
      component: 'OrganisationCard',
      actions: [
        { 
          id: 'edit-organisation', icon: 'las la-edit', tooltip: 'OrganisationCard.EDIT',
          visible: { name: '$can', params: ['update', 'organisations', null, { _id: ':item._id' }] },
          route: { name: 'organisation-settings-activity', params: { contextId: ':item._id', page: 'properties' } }
        },
        { 
          id: 'remove-organisation', icon: 'las la-trash', tooltip: 'OrganisationCard.DELETE',
          visible: { name: '$can', params: ['remove', 'organisations', null, { _id: ':item._id' }] },
          handler: { name: 'removeItem', params: ['input'] }
        }
      ]
    }
  },
  eventsActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        'default': [
          { component: 'OrganisationAvatar' },
          separator,
          { id: 'events', icon: 'las la-fire', label: 'EventsActivity.EVENTS_LABEL', color: 'primary', disabled: true },
          { 
            id: 'catalog', icon: 'las la-map', tooltip: 'Context.CATALOG',
            visible: { name: '$can', params: ['update', 'catalog', ':contextId'] },
            route: { name: 'catalog-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'archived-events', icon: 'las la-clipboard-list', tooltip: 'Context.ARCHIVED_EVENTS',
            visible: { name: '$can', params: ['read', 'archived-events', ':contextId'] },
            route: { name: 'archived-events-activity', params: { contextId: ':contextId' } },    
          },
          midSeparator,
          { id: 'event-sorter',
            component: 'collection/KSorter', 
            tooltip: 'EventsActivity.SORT_EVENTS',
            options: [
              { icon: 'kdk:clockwise.png', value: { field: 'updatedAt', order: 1 } },
              { icon: 'kdk:anticlockwise.png', value: { field: 'updatedAt', order: -1 }, default: true },
              { icon: 'las la-sort-alpha-down', value: { field: 'name', order: 1 } },
              { icon: 'las la-sort-alpha-up', value: { field: 'name', order: -1 } }
            ]
          },
          { id: 'search-event', icon: 'las la-search', tooltip: 'EventsActivity.SEARCH_EVENTS', handler: { name: 'setTopPaneMode', params: ['filter'] } },
        ],
        'filter': contextFilter('name')
      }
    },
    items: {
      actions: [
        { id: 'capture-photo', tooltip: 'EventCard.ADD_MEDIA_LABEL', icon: 'las la-camera', handler:  'capturePhoto',
          visible: ['canCapturePhoto', { name: '$can', params: ['update', 'events', ':contextId', ':item'] }] },
        { id: 'add-media', tooltip: 'EventCard.ADD_MEDIA_LABEL', icon: 'las la-paperclip', handler:  'uploadMedia',
          visible: { name: '$can', params: ['update', 'events', ':contextId', ':item'] } },
        { id: 'event-map', tooltip: 'EventCard.MAP_LABEL', icon: 'las la-map-marked-alt', handler:  'viewMap',
          visible: ['hasLocation', { name: '$can', params: ['read', 'events', ':contextId', ':item'] }] },
        { id: 'navigate', tooltip: 'EventCard.NAVIGATE_LABEL', icon: 'las la-location-arrow', handler:  'launchNavigation',
          visible: ['hasLocation', 'canNavigate', { name: '$can', params: ['read', 'events', ':contextId', ':item'] }] },
        { id: 'edit-event', tooltip: 'EventCard.EDIT_LABEL', icon: 'las la-file-alt',
          visible: { name: '$can', params: ['update', 'events', ':contextId', ':item'] },
          route: { name: 'edit-event', params: { contextId: ':contextId', objectId: ':item._id' } } },
        { id: 'remove-event', tooltip: 'EventCard.REMOVE_LABEL', icon: 'las la-minus-circle', handler: 'removeEvent',
          visible: { name: '$can', params: ['remove', 'events', ':contextId', ':item'] } }
      ]
    }
  },
  catalogActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        default: [
          { component: 'OrganisationAvatar' },
          separator,
          { 
            id: 'events', icon: 'las la-fire', tooltip: 'EventsActivity.EVENTS_LABEL',
            visible: { name: '$can', params: ['service', 'events', ':contextId'] },
            route: { name: 'events-activity', params: { contextId: ':contextId' } },    
          },
          { id: 'catalog', icon: 'las la-map', label: 'Context.CATALOG', color: 'primary', disabled: true },
          { 
            id: 'archived-events', icon: 'las la-clipboard-list', tooltip: 'Context.ARCHIVED_EVENTS',
            visible: { name: '$can', params: ['read', 'archived-events', ':contextId'] },
            route: { name: 'archived-events-activity', params: { contextId: ':contextId' } },    
          },
          midSeparator,
          { component: 'KLocateUser' },
          { id: 'search-location', icon: 'las la-search-location', tooltip: 'mixins.activity.SEARCH_LOCATION', handler: { name: 'setTopPaneMode', params: ['search-location'] } },
          {
            id: 'manage-favorite-views', component: 'frame/KMenu', icon: 'star_border', persistent: true, autoClose: false, tooltip: 'KFavoriteViews.FAVORITE_VIEWS_LABEL',
            content: [
              { component: 'KFavoriteViews' }
            ]
          },
          {
            id: 'tools', component: 'frame/KMenu', icon: 'las la-wrench', tooltip: 'mixins.activity.TOOLS', actionRenderer: 'item',
            content: [
              { id: 'display-position', icon: 'las la-plus', label: 'mixins.activity.DISPLAY_POSITION', handler: { name: 'setTopPaneMode', params: ['display-position'] } }
            ]
          },
          { id: 'toggle-fullscreen', icon: 'las la-expand', tooltip: 'mixins.activity.ENTER_FULLSCREEN', toggle: { icon: 'las la-compress', tooltip: 'mixins.activity.EXIT_FULLSCREEN' }, handler: 'onToggleFullscreen' },
        ],
        'display-position': [
          { id: 'back', icon: 'las la-arrow-left', handler: { name: 'setTopPaneMode', params: ['default'] } },
          { component: 'QSeparator', vertical: true, color: 'lightgrey' },
          { component: 'KPositionIndicator' }
        ],
        'search-location': [
          { id: 'back', icon: 'las la-arrow-left', handler: { name: 'setTopPaneMode', params: ['default'] } },
          { component: 'QSeparator', vertical: true, color: 'lightgrey' },
          { component: 'KSearchLocation' }
        ]
      }
    },
    rightPane: {
      content: [{
        component: 'catalog/KCatalog', bind: '$data'
      }, {
        component: 'QSpace'
      }, {
        component: 'frame/KPanel',
        content: [
          { id: 'manage-layer-categories', icon: 'las la-cog', label: 'KLayerCategories.LAYER_CATEGORIES_LABEL',
            route: { name: 'manage-layer-categories', params: { south: ':south', north: ':north', west: ':west', east: ':east' }, query: { layers: ':layers' } } }
        ]
      }]
    },
    bottomPane: {
      content: [
        { component: 'KTimeline' }
      ]
    },
    page: {
      content: [{
        component: 'frame/KPageSticky', position: 'left', offset: [18, 0], content: [{ component: 'KColorLegend' }]
      }, {
        component: 'frame/KPageSticky', position: 'top-left', offset: [18, 18], content: [{ component: 'KUrlLegend' }]
      }, {
        component: 'KFeatureActionButton'
      }]
    },
    window: {
      widgets: widgets
    },
    fab: {
      actions: [
        { id: 'add-layer', icon: 'las la-plus', label: 'mixins.activity.ADD_LAYER',
          route: { name: 'add-layer', params: { south: ':south', north: ':north', west: ':west', east: ':east' }, query: { layers: ':layers' } } },
        { id: 'probe-location', icon: 'las la-eye-dropper', label: 'mixins.activity.PROBE', handler: 'onProbeLocation' }
      ]
    },
    engine: defaultMapOptions,
    catalog: defaultMapCatalog,
    layers: {
      actions: layerActions
    },
    featuresChunkSize: 5000 // TODO: here or in mapEngine ?
  },
  archivedEventsActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        'history': [
          { component: 'OrganisationAvatar' },
          separator,
          { 
            id: 'events', icon: 'las la-fire', tooltip: 'EventsActivity.EVENTS_LABEL',
            visible: { name: '$can', params: ['service', 'events', ':contextId'] },
            route: { name: 'events-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'catalog', icon: 'las la-map', tooltip: 'Context.CATALOG',
            visible: { name: '$can', params: ['update', 'catalog', ':contextId'] },
            route: { name: 'catalog-activity', params: { contextId: ':contextId' } },    
          },
          { id: 'archived-events', icon: 'las la-clipboard-list', label: 'Context.ARCHIVED_EVENTS', color: 'primary', disabled: true },
          midSeparator,
          { id: 'map-view', icon: 'las la-map-marked', tooltip: 'ArchivedEventsActivity.SHOW_MAP_LABEL', handler: 'onShowMap' },
          { id: 'chart-view', icon: 'las la-chart-pie', tooltip: 'ArchivedEventsActivity.SHOW_CHART_LABEL', handler: 'onShowChart' },
          { component: 'input/KTimeRangeChooser', id: 'timerange', icon: 'las la-calendar',
            on: { event: 'time-range-choosed', listener: 'onTimeRangeChanged' } },
          { id: 'history-sort', icon: 'las la-sort-amount-down', tooltip: 'ArchivedEventsActivity.ASCENDING_SORT',
            toggle: { icon: 'las la-sort-amount-up', color: 'grey-9', tooltip: 'ArchivedEventsActivity.DESCENDING_SORT' }, handler: 'onSortOrder' },
          { id: 'export-data', icon: 'las la-file-download', tooltip: 'ArchivedEventsActivity.EXPORT_DATA_LABEL', handler: 'downloadEventsData' },
        ],
        'map': [
          { id: 'history-view', icon: 'las la-arrow-left', tooltip: 'ArchivedEventsActivity.SHOW_HISTORY_LABEL', handler: 'onShowHistory' },
          midSeparator,
          { id: 'by-template', icon: 'las la-layer-group', tooltip: 'ArchivedEventsActivity.SHOW_BY_TEMPLATE_LABEL',
            toggle: { icon: 'las la-object-group', color: 'grey-9', tooltip: 'ArchivedEventsActivity.SHOW_ALL_LABEL' }, handler: 'onByTemplate' },
          { id: 'heatmap', icon: 'las la-bowling-ball', tooltip: 'ArchivedEventsActivity.SHOW_HEATMAP_LABEL',
            toggle: { icon: 'scatter_plot', color: 'grey-9', tooltip: 'ArchivedEventsActivity.SHOW_MARKERS_LABEL' }, handler: 'onHeatmap' },
          { id: 'export-data', icon: 'las la-file-download', tooltip: 'ArchivedEventsActivity.EXPORT_DATA_LABEL', handler: 'downloadEventsData' }
          // contextHelp('archived-events-activity/map')
        ],
        'chart': [
          { id: 'history-view', icon: 'las la-arrow-left', tooltip: 'ArchivedEventsActivity.SHOW_HISTORY_LABEL', handler: 'onShowHistory' },
          midSeparator,
          { id: 'settings', icon: 'las la-cog', tooltip: 'ArchivedEventsActivity.CHART_SETTINGS_LABEL', handler: 'showChartSettings' },
          { id: 'export-data', icon: 'las la-file-download', tooltip: 'ArchivedEventsActivity.CHART_EXPORT_LABEL', handler: 'downloadChartData' }
          // contextHelp('archived-events-activity/chart')
        ]
      }
    },
    rightPane: {
      content: {
        'history': [],
        'map': [ { component: 'catalog/KCatalog', bind: '$data' } ],
        'chart': []
      }
    },
    items: {
      actions: [
        { id: 'view-event', tooltip: 'ArchivedEventEntry.VIEW_LABEL', icon: 'las la-file-alt',
          route: { name: 'view-event', params: { contextId: ':contextId', objectId: ':item._id' } },
          visible: { name: '$can', params: ['read', 'archived-events', ':contextId'] } },
        { id: 'locate', tooltip: 'ArchivedEventEntry.LOCATE_LABEL', icon: 'las la-map-marker', handler: 'locate',
          visible: ['hasLocation', { name: '$can', params: ['read', 'archived-events', ':contextId'] }] },
        { id: 'map', tooltip: 'ArchivedEventEntry.MAP_LABEL', icon: 'las la-map-marked-alt', handler: 'followUp',
          visible: { name: '$can', params: ['read', 'archived-events', ':contextId'] } },
        { id: 'browse-media', tooltip: 'ArchivedEventEntry.BROWSE_MEDIA_LABEL', icon: 'las la-photo-video', handler: 'browseMedia',
          visible: ['hasMedias', { name: '$can', params: ['read', 'archived-events', ':contextId'] }] }
      ]
    },
    engine: defaultMapOptions,
    catalog: { categories: [baseLayers] },
    layers: {
      actions: layerActions,
      filter: { id: { $in: ['layer-actions', 'zoom-to'] } }
    },
    restore: { view: false, layers: false }
  },
  membersActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        'default': [
          { component: 'OrganisationAvatar' },
          separator,
          { id: 'members', icon: 'las la-user-friends', label: 'KMembersActivity.MEMBERS_LABEL', color: 'primary', disabled: true },
          { 
            id: 'tags', icon: 'las la-tags', tooltip: 'KTagsActivity.TAGS_LABEL',
            visible: { name: '$can', params: ['service', 'tags', ':contextId'] },
            route: { name: 'tags-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'groups', icon: 'las la-sitemap', tooltip: 'KGroupsActivity.GROUPS_LABEL',
            visible: { name: '$can', params: ['service', 'groups', ':contextId'] },
            route: { name: 'groups-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'event-templates', icon: 'las la-project-diagram', tooltip: 'EventTemplatesActivity.EVENT_TEMPLATES_LABEL',
            visible: { name: '$can', params: ['service', 'event-templates', ':contextId'] },
            route: { name: 'event-templates-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'settings', icon: 'las la-cog', tooltip: 'OrganisationSettingsActivity.SETTINGS',
            visible: { name: '$can', params: ['update', 'organisations', null, { _id: ':contextId' }] },
            route: { name: 'organisation-settings-activity', params: { contextId: ':contextId', page: 'properties' } },    
          },
          midSeparator,
          { component: 'team/KMemberFilter' },
          { component: 'collection/KSorter', 
            id: 'member-sorter',
            tooltip: 'KMembersActivity.SORT_MEMBERS',
            options: [
              { icon: 'las la-sort-alpha-down', value: { field: 'profile.name', order: 1 }, default: true },
              { icon: 'las la-sort-alpha-up', value: { field: 'profile.name', order: -1 } }
            ]
          },
          { id: 'search-member', icon: 'las la-search', tooltip: 'KMembersActivity.SEARCH_MEMBERS', handler: { name: 'setTopPaneMode', params: ['filter'] } }
        ],
        'filter': contextFilter('profile.name', [
          { service: 'groups', field: 'name', baseQuery: {}, icon: 'las la-sitemap' },
          { service: 'tags', field: 'value', baseQuery: {}, icon: 'las la-tag' }
        ])
      }
    },
    fab: {
      actions: [{ 
        id: 'add-member', icon: 'las la-plus', tooltip: 'KMembersActivity.ADD_USER_LABEL',
        visible: { name: '$can', params: ['update', 'organisations', ':contextId'] },
        route: { name: 'add-member' } 
      }]
    },
    items: {
      actions: [
        { id: 'tag-member', icon: 'las la-tags', tooltip: 'KMemberCard.TAG_LABEL',
          route: { name: 'tag-member', params: { contextId: ':contextId', objectId: ':item._id' } },
          visible: ['!item.expireAt', { name: '$can', params: ['update', 'members', ':contextId'] }] },
        { id: 'change-role', icon: 'las la-graduation-cap', tooltip: 'KMemberCard.CHANGE_ROLE_LABEL',
          route: { name: 'change-role', params: { contextId: ':contextId', objectId: ':item._id' } },
          visible: ['!item.expireAt', { name: '$can', params: ['update', 'members', ':contextId'] }] },
        { id: 'reissue-invitation', icon: 'las la-envelope', tooltip: 'KMemberCard.RESEND_INVITATION_LABEL', handler: 'resendInvitation',
          visible: ['item.expireAt', { name: '$can', params: ['update', 'members', ':contextId'] }] },
        { id: 'card-overflow-menu', component: 'frame/KMenu', actionRenderer: 'item',
          visible: ['!item.expireAt', { name: '$can', params: ['remove', 'authorisations', ':contextId', { resource: ':contextId' }] }],
          content: [{ id: 'remove-member', icon: 'las la-minus-circle', label: 'KMemberCard.REMOVE_LABEL', handler: 'removeMember' }] }
      ]
    }
  },
  tagsActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        'default': [      
          { component: 'OrganisationAvatar' },
          separator,          
          { 
            id: 'members', icon: 'las la-user-friends', tooltip: 'KMembersActivity.MEMBERS_LABEL',
            visible: { name: '$can', params: ['service', 'members', ':contextId'] },
            route: { name: 'members-activity', params: { contextId: ':contextId' } },    
          },
          { id: 'tags', icon: 'las la-tags', label: 'KTagsActivity.TAGS_LABEL', color: 'primary', disabled: true },
          { 
            id: 'groups', icon: 'las la-sitemap', tooltip: 'KGroupsActivity.GROUPS_LABEL',
            visible: { name: '$can', params: ['service', 'groups', ':contextId'] },
            route: { name: 'groups-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'event-templates', icon: 'las la-project-diagram', tooltip: 'EventTemplatesActivity.EVENT_TEMPLATES_LABEL',
            visible: { name: '$can', params: ['service', 'event-templates', ':contextId'] },
            route: { name: 'event-templates-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'settings', icon: 'las la-cog', tooltip: 'OrganisationSettingsActivity.SETTINGS',
            visible: { name: '$can', params: ['update', 'organisations', null, { _id: ':contextId' }] },
            route: { name: 'organisation-settings-activity', params: { contextId: ':contextId', page: 'properties' } },    
          },
          midSeparator,
          { component: 'collection/KSorter', 
            id: 'tag-sorter',
            tooltip: 'KTagsActivity.SORT_TAGS',
            options: [
              { icon: 'las la-sort-alpha-down', value: { field: 'value', order: 1 }, default: true },
              { icon: 'las la-sort-alpha-up', value: { field: 'value', order: -1 } }
            ]
          },
          { id: 'search-tag', icon: 'las la-search', tooltip: 'KTagsActivity.SEARCH_TAGS', handler: { name: 'setTopPaneMode', params: ['filter'] } }
        ],
        'filter': contextFilter('value')
      }
    },
    items: {
      actions: [
        { id: 'edit-tag', tooltip: 'KTagCard.EDIT_LABEL', icon: 'las la-file-alt',
          visible: { name: '$can', params: ['update', 'tags', ':contextId', ':item'] },
          route: { name: 'edit-tag', params: { contextId: ':contextId', objectId: ':item._id' } } },
        { id: 'list-members', tooltip: 'KTagCard.LIST_MEMBERS_LABEL', icon: 'las la-user-tag', handler: 'onListMembers' }
      ]
    }
  },
  groupsActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        'default': [
          { component: 'OrganisationAvatar' },
          separator,
          { 
            id: 'members', icon: 'las la-user-friends', tooltip: 'KMembersActivity.MEMBERS_LABEL',
            visible: { name: '$can', params: ['service', 'members', ':contextId'] },
            route: { name: 'members-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'tags', icon: 'las la-tags', tooltip: 'KTagsActivity.TAGS_LABEL',
            visible: { name: '$can', params: ['service', 'tags', ':contextId'] },
            route: { name: 'tags-activity', params: { contextId: ':contextId' } },    
          },
          { id: 'groups', icon: 'las la-sitemap', label: 'KGroupsActivity.GROUPS_LABEL', color: 'primary', disabled: true },
          { 
            id: 'event-templates', icon: 'las la-project-diagram', tooltip: 'EventTemplatesActivity.EVENT_TEMPLATES_LABEL',
            visible: { name: '$can', params: ['service', 'event-templates', ':contextId'] },
            route: { name: 'event-templates-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'settings', icon: 'las la-cog', tooltip: 'OrganisationSettingsActivity.SETTINGS',
            visible: { name: '$can', params: ['update', 'organisations', null, { _id: ':contextId' }] },
            route: { name: 'organisation-settings-activity', params: { contextId: ':contextId', page: 'properties' } },    
          },
          midSeparator,          
          { id: 'group-sorter', component: 'collection/KSorter', tooltip: 'KGroupsActivity.SORT_GROUPS' },
          { id: 'search-group', icon: 'las la-search', tooltip: 'KGroupsActivity.SEARCH_GROUPS', handler: { name: 'setTopPaneMode', params: ['filter'] } }
        ],
        'filter': contextFilter('name')
      }
    },
    fab: {
      actions: [
        { id: 'create-group', icon: 'las la-plus', tooltip: 'KGroupsActivity.CREATE_GROUP_LABEL', route: { name: 'create-group', params: { contextId: ':contextId' } } }
      ]
    },
    items: {
      actions: [
        { id: 'edit-group', tooltip: 'KGroupCard.EDIT_LABEL', icon: 'las la-file-alt',
          visible: { name: '$can', params: ['update', 'groups', ':contextId', ':item'] },
          route: { name: 'edit-group', params: { contextId: ':contextId', objectId: ':item._id' } } },
        { id: 'list-members', tooltip: 'KGroupCard.LIST_MEMBERS_LABEL', icon: 'las la-user-circle',
          visible: { name: '$can', params: ['service', 'members', ':contextId'] }, handler: 'onListMembers' },
        { id: 'remove-group', tooltip: 'KGroupCard.REMOVE_LABEL', icon: 'las la-minus-circle',
          visible: { name: '$can', params: ['remove', 'groups', ':contextId', ':item'] }, handler: 'removeGroup' }
      ]
    }
  },
  eventTemplatesActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        'default': [ 
          { component: 'OrganisationAvatar' },
          separator,
          { 
            id: 'members', icon: 'las la-user-friends', tooltip: 'KMembersActivity.MEMBERS_LABEL',
            visible: { name: '$can', params: ['service', 'members', ':contextId'] },
            route: { name: 'members-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'groups', icon: 'las la-sitemap', tooltip: 'KGroupsActivity.GROUPS_LABEL',
            visible: { name: '$can', params: ['service', 'groups', ':contextId'] },
            route: { name: 'groups-activity', params: { contextId: ':contextId' } },    
          },
          { 
            id: 'tags', icon: 'las la-tags', tooltip: 'KTagsActivity.TAGS_LABEL',
            visible: { name: '$can', params: ['service', 'tags', ':contextId'] },
            route: { name: 'tags-activity', params: { contextId: ':contextId' } },    
          },
          { id: 'event-templates', icon: 'las la-project-diagram', label: 'EventTemplatesActivity.EVENT_TEMPLATES_LABEL', color: 'primary', disabled: true },
          { 
            id: 'settings', icon: 'las la-cog', tooltip: 'OrganisationSettingsActivity.SETTINGS',
            visible: { name: '$can', params: ['update', 'organisations', null, { _id: ':contextId' }] },
            route: { name: 'organisation-settings-activity', params: { contextId: ':contextId', page: 'properties' } },    
          },
          midSeparator,
          { id: 'event-template-sorter', component: 'collection/KSorter', tooltip: 'EventTemplatesActivity.SORT_EVENT_TEMPLATES' },
          { id: 'search-event-template', icon: 'las la-search', tooltip: 'EventTemplatesActivity.SEARCH_EVENT_TEMPLATES', handler: { name: 'setTopPaneMode', params: ['filter'] } },
        ],
        'filter': contextFilter('name')
      }
    },
    fab: {
      actions: [
        { id: 'create-event-template', icon: 'las la-plus', tooltip: 'EventTemplatesActivity.CREATE_TEMPLATE_LABEL',
          visible: { name: '$can', params: ['create', 'event-templates', ':contextId'] },
          route: { name: 'create-event-template', params: { contextId: ':contextId' } } }
      ]
    },
    items: {
      actions: [
        { id: 'edit-event-template', tooltip: 'EventTemplateCard.EDIT_LABEL', icon: 'las la-file-alt',
          visible: { name: '$can', params: ['update', 'event-templates', ':contextId', ':item'] },
          route: { name: 'edit-event-template', params: { contextId: ':contextId', objectId: ':item._id' } } },
        { id: 'copy-event-template', tooltip: 'EventTemplateCard.COPY_LABEL', icon: 'las la-copy',
          visible: { name: '$can', params: ['update', 'event-templates', ':contextId', ':item'] },
          route: { name: 'create-event-template', params: { contextId: ':contextId', templateId: ':item._id' } } },
        { id: 'remove-event-template', tooltip: 'EventTemplateCard.REMOVE_LABEL', icon: 'las la-minus-circle',
          visible: { name: '$can', params: ['remove', 'event-templates', ':contextId', ':item'] }, handler: 'removeEventTemplate' }
      ]
    }
  },
  organisationSettingsActivity: {
    leftPane: leftPane(),
    topPane: {
      content: [
        { component: 'OrganisationAvatar' },
        separator,
        { 
          id: 'members', icon: 'las la-user-friends', tooltip: 'KMembersActivity.MEMBERS_LABEL',
          visible: { name: '$can', params: ['service', 'members', ':contextId'] },
          route: { name: 'members-activity', params: { contextId: ':contextId' } },    
        },
        { 
          id: 'tags', icon: 'las la-tags', tooltip: 'KTagsActivity.TAGS_LABEL',
          visible: { name: '$can', params: ['service', 'tags', ':contextId'] },
          route: { name: 'tags-activity', params: { contextId: ':contextId' } },    
        },
        { 
          id: 'groups', icon: 'las la-sitemap', tooltip: 'KGroupsActivity.GROUPS_LABEL',
          visible: { name: '$can', params: ['service', 'groups', ':contextId'] },
          route: { name: 'groups-activity', params: { contextId: ':contextId' } },    
        },
        { 
          id: 'event-templates', icon: 'las la-project-diagram', tooltip: 'EventTemplatesActivity.EVENT_TEMPLATES_LABEL',
          visible: { name: '$can', params: ['service', 'event-templates', ':contextId'] },
          route: { name: 'event-templates-activity', params: { contextId: ':contextId' } },    
        },
        { id: 'settings', icon: 'las la-cog', label: 'OrganisationSettingsActivity.SETTINGS', color: 'primary', disabled: true },
      ]
    }
  },
  eventActivity: {
    leftPane: leftPane(),
    topPane: {
      content: {
        default: [
          { id: 'organisation', icon: 'las la-arrow-left', tooltip: 'Context.ORGANISATION', route: { name: 'context', params: { contextId: ':contextId' } } },
          separator,
          { component: 'KLocateUser' },
          { id: 'search-location', icon: 'las la-search-location', tooltip: 'mixins.activity.SEARCH_LOCATION', handler: { name: 'setTopPaneMode', params: ['search-location'] } },
          {
            id: 'tools', component: 'frame/KMenu', icon: 'las la-wrench', tooltip: 'mixins.activity.TOOLS', actionRenderer: 'item',
            content: [
              { id: 'display-position', icon: 'las la-plus', label: 'mixins.activity.DISPLAY_POSITION', handler: { name: 'setTopPaneMode', params: ['display-position'] } }
            ]
          },
          { id: 'toggle-fullscreen', icon: 'las la-expand', tooltip: 'mixins.activity.ENTER_FULLSCREEN', toggle: { icon: 'las la-compress', tooltip: 'mixins.activity.EXIT_FULLSCREEN' }, handler: 'onToggleFullscreen' },
          { component: 'QSeparator', vertical: true, color: 'lightgrey' }
        ],
        'display-position': [
          { id: 'back', icon: 'las la-arrow-left', handler: { name: 'setTopPaneMode', params: ['default'] } },
          { component: 'QSeparator', vertical: true, color: 'lightgrey' },
          { component: 'KPositionIndicator' }
        ],
        'search-location': [
          { id: 'back', icon: 'las la-arrow-left', handler: { name: 'setTopPaneMode', params: ['default'] } },
          { component: 'QSeparator', vertical: true, color: 'lightgrey' },
          { component: 'KSearchLocation' }
        ]
      }
    },
    rightPane: {
      content: [
        { component: 'EventActivityPanel', bind: '$data' }
      ]
    },
    bottomPane: {
      content: [
        { component: 'KTimeline' }
      ]
    },
    page: {
      content: [{
        component: 'frame/KPageSticky', position: 'left', offset: [18, 0], content: [{ component: 'KColorLegend' }]
      }]
    },
    window: {
      widgets: widgets
    },
    fab: {
      actions: [
        { id: 'add-media', label: 'EventActivity.ADD_MEDIA_LABEL', icon: 'las la-paperclip', handler: 'uploadMedia',
          visible: { name: '$can', params: ['update', 'events', ':contextId', ':event'] } },
        { id: 'browse-media', label: 'EventActivity.BROWSE_MEDIA_LABEL', icon: 'photo_library', handler: 'browseMedia',
          visible: { name: '$can', params: ['update', 'events', ':contextId', ':event'] } },
        { id: 'edit-event', label: 'EventActivity.EDIT_LABEL', icon: 'las la-file-alt',
          visible: { name: '$can', params: ['update', 'events', ':contextId', ':event'] },
          route: { name: 'edit-map-event', params: { contextId: ':contextId', objectId: ':objectId' } } },
        { id: 'probe-location', icon: 'las la-eye-dropper', label: 'mixins.activity.PROBE', handler: 'onProbeLocation' }
      ]
    },
    engine: defaultMapOptions,
    catalog: defaultMapCatalog,
    layers: {
      actions: layerActions,
      filter: { id: { $in: ['layer-actions', 'zoom-to'] } }
    },
    restore: { view: false, layers: false },
    featuresChunkSize: 5000 // TODO: here or in mapEngine ?
  },
  
  routes: require('../src/router/routes')
}
