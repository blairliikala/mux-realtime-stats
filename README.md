# Mux Realtime Views

Helper to display realtime views for assets and live streams using the Mux API.

## Usage:

```html
<mux-realtime-views 
  api="${real_time_views}" 
  views
  viewers
></mux-realtime-views> 
```

## Parameters

| Name | Description | Default |
| - | - | - |
| token | (Required) Signed token required to get stats. (see mux.com for details) | empty |
| views | Show how many views with premade styles and animations. | undefined |
| viewers | Show how many viewers with premade styles and animations. | undefined |
| views-label | Label for Views, replaced "views" | Watching |
| viewer-label | Label for Viewers, replaced "viewers" | Viewers |
| pinginterval | How often to check for view data in miliseconds.  Min of 5 seconds. | 5000 |
| data | (Read-only Object) The current raw response from mux.com | |
| errorcount | (Read-only Number) Get the number of fetching errors. Reset after a successful fetch | |
| lastUpdate | (Read-only Object) Contains the `seconds` and `relative` time since the last update | |
| tokenTimeleft | (Read-only Object) Contains the `seconds` `relative` and `date` time left before the token expires and a new token is required for getting updates. | |



## Customize using Slots

To style and customize the component, switch to using slots like the example below.  Start by creating an element like a `div` or `section` with the parameter `slot="views"`.  Somewhere inside the slot, include an element with the `data-views` parameter.  This will be what updates when view counts update.

```html
<style>
  .my_views {
      color: blue;
  }
</style>
<div slot="views"><span data-views class="my_views">0</span> Watching</div>
<div slot="viewers"><span data-viewers>0</span> viewers</div>
```

## Events

| Name | Description |
| - | - |
| update | Fired every ping interval and contains the response from Mux. |
| increase | When a view or viewer increases from the previous value. |
| decrease | When a view or viewer decreases from the previous value. |
| error | A fetch of new data has run into a problem.  Contains the status code, text response, optionally an object of more info. |
| expired | The access `token` has expired, and checking for view updates has stopped.  Provide a new `token` to continue checking for updates. |
