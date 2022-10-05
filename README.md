# Mux Realtime Views

Helper to display realtime views for assets and live streams using the Mux API.

This is a select portion of software used in the commercial ExpressionEngine MuxEE addon posted here for demonstration purposes.

## Usage

```html
<mux-realtime-views
  token="${real_time_views}"
  views
  viewers
></mux-realtime-views>
```

### Custom View Labels

```html
<mux-realtime-views
  token="{token}"
  views
  viewers
  viewers-label="Custom Viewers Title"
  views-label="Custom View Title"
></mux-realtime-views>
```

## Tag Parameters

| Name | Description | Default |
| - | - | - |
| token | (Required) Signed token required to get stats. (see mux.com for details) | empty |
| views | Show how many views with premade styles and animations. | undefined |
| viewers | Show how many viewers with premade styles and animations. | undefined |
| views-label | Label for Views, replaced "views" | Watching |
| viewer-label | Label for Viewers, replaced "viewers" | Viewers |
| refresh | How often to check for view data in miliseconds.  Min of 5 seconds. | 5 |

## Customize using Slots

To style and customize the component, switch to using slots like the example below.  Start by creating an element like a `div` or `section` with the parameter `slot="views"`.  Somewhere inside the slot, include an element with the `data-views` parameter.  This will be what updates when view counts update.

```html
<style>
  .my_views {
      color: blue;
  }
</style>
<mux-realtime-views token="{token}">
  <div slot="views">
      <span class="my_views" data-views>
        <span data-amount>0</span>
      </span> watching</div>

  <div slot="viewers">
    <span class="my_views" data-viewers>
      <span data-amount>0</span>
    </span> viewers
  </div>
</mux-realtime-views>
```

## Events

| Name | Description |
| - | - |
| update | Fired every ping interval and contains the response from Mux. |
| increase | When a view or viewer increases from the previous value. |
| decrease | When a view or viewer decreases from the previous value. |
| error | A fetch of new data has run into a problem.  Contains the status code, text response, optionally an object of more info. |
| expired | The access `token` has expired, and checking for view updates has stopped.  Provide a new `token` to continue checking for updates. |

## Methods

| Name | Description |
| - | - |
| start() | Start checking for updates. |
| stop() | Stop checking for updates. |

## Properties

| Name | Description | Default |
| - | - | - |
| data | (Read-only Object) The current raw response from mux.com | |
| errorcount | (Read-only Number) Get the number of fetching errors. Reset after a successful fetch | |
| lastUpdate | (Read-only Object) Contains the `seconds` and `relative` time since the last update | |
| tokenTimeleft | (Read-only Object) Contains the `seconds` `relative` and `date` time left before the token expires and a new token is required for getting updates. | |
