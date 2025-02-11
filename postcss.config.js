import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'

export default {
  plugins: [
    tailwindcss,
    autoprefixer({
      flexbox: 'no-2009',
      grid: 'autoplace'
    }),
    cssnano({
      preset: ['default', {
        discardComments: {
          removeAll: true,
        },
        minifyFontValues: true,
        minifyGradients: true,
        normalizeWhitespace: true,
        colormin: true,
        convertValues: true,
        discardDuplicates: true,
        discardOverridden: true,
        mergeLonghand: true,
        mergeRules: true,
        minifyParams: true,
        minifySelectors: true,
        normalizeCharset: true,
        normalizeDisplayValues: true,
        normalizePositions: true,
        normalizeRepeatStyle: true,
        normalizeString: true,
        normalizeTimingFunctions: true,
        normalizeUnicode: true,
        normalizeUrl: true,
        orderedValues: true,
        reduceBackgroundRepeat: true,
        reduceDisplayValues: true,
        reducePositions: true,
        uniqueSelectors: true,
        zindex: false
      }]
    })
  ]
}
