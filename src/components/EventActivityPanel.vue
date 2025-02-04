<template>
  <k-catalog :layers="layers" :layerCategories="layerCategories"
    :forecastModels="forecastModels" :forecastModelHandlers="forecastModelHandlers" :forecastModel="forecastModel" >
    <div slot="footer" >
      <q-expansion-item icon="las la-user" header-class="text-primary" :label="$t('EventActivityPanel.PARTICIPANTS_LABEL')">
        <template v-for="participant in participants">
          <div class="row justify-between no-wrap" style="overflow: auto" :key="participant._id">
            <div class="col-auto self-center">
              <q-btn flat round small color="primary" @click="onStateClicked(participant)">
                <k-avatar :object="participant" />
                <q-tooltip v-if="participant.step" content-class="bg-primary" >{{ getUserState(participant) }}</q-tooltip>
                <q-tooltip v-if="participant.step" :offset="[0, 48]">{{ $t('EventActivityPanel.FILTER_PARTICIPANTS') }}</q-tooltip>
              </q-btn>
              <span>{{ getUserName(participant) }}&nbsp;&nbsp;</span>
            </div>
            <k-text-area class="self-center text-italic" :text="getUserComment(participant)" :length="30"/>
            <div class="col-auto self-center">
              <q-btn v-if="!archived && canFollowUpUser(participant)" flat round small color="primary" @click="doUserFollowUp(participant._id)">
                <q-icon name="las la-sms" color="red" />
                <q-tooltip>{{ getUserFollowUp(participant) }}</q-tooltip>
              </q-btn>
              <q-btn flat round small color="primary" @click="onZoomClicked(participant)">
                <q-icon name="las la-search-location" />
              </q-btn>
            </div>
          </div>
        </template>
      </q-expansion-item>
    </div>
  </k-catalog>
</template>

<script>
import _ from 'lodash'
import { utils as kCoreUtils } from '@kalisio/kdk/core.client'
import mixins from '../mixins'

export default {
  name: 'event-activity-panel',
  mixins: [
    mixins.events
  ],
  props: {
    layers: {
      type: Object,
      required: true
    },
    layerCategories: {
      type: Array,
      required: true
    },
    forecastModels: {
      type: Array,
      required: true
    },
    forecastModelHandlers: {
      type: Object,
      required: true
    },
    forecastModel: {
      type: Object,
      required: true
    },
    participants: {
      type: Array,
      required: true
    },
    event: {
      type: Object,
      required: true
    }
  },
  methods: {
    participantIconName (participant) {
      return kCoreUtils.getIconName(participant)
    },
    participantIconColor (participant) {
      return _.get(participant, 'icon.color', '')
    },
    onZoomClicked (participant) {
      this.$events.$emit('zoom-to-participant', participant)
    },
    onStateClicked (participant) {
      this.$events.$emit('filter-participant-states', participant)
    }
  },
  created () {
    // Loads the required components
    this.$options.components['k-avatar'] = this.$load('frame/KAvatar')
    this.$options.components['k-text-area'] = this.$load('frame/KTextArea')
    this.$options.components['k-catalog'] = this.$load('catalog/KCatalog')
    // Archived mode ?
    this.archived = _.get(this.$route, 'query.archived')
  }
}
</script>
