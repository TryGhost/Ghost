@function breakpoint-make-resolutions($resolution) {
  $length: length($resolution);

  $output: ();

  @if $length == 2 {
    $feature: '';
    $value: '';

    // Find which is number
    @if type-of(nth($resolution, 1)) == 'number' {
      $value: nth($resolution, 1);
    }
    @else {
      $value: nth($resolution, 2);
    }

    // Determine min/max/standard
    @if index($resolution, 'min-resolution') {
      $feature: 'min-';
    }
    @else if index($resolution, 'max-resolution') {
      $feature: 'max-';
    }

    $standard: '(#{$feature}resolution: #{$value})';

    // If we're not dealing with dppx,
    @if unit($value) != 'dppx' {
      $base: 96dpi;
      @if unit($value) == 'dpcm' {
        $base: 243.84dpcm;
      }
      // Write out feature tests
      $webkit: '';
      $moz: '';
      $webkit: '(-webkit-#{$feature}device-pixel-ratio: #{$value / $base})';
      $moz: '(#{$feature}-moz-device-pixel-ratio: #{$value / $base})';
      // Append to output
      $output: append($output, $standard, space);
      $output: append($output, $webkit, space);
      $output: append($output, $moz, space);
    }
    @else {
      $webkit: '';
      $moz: '';
      $webkit: '(-webkit-#{$feature}device-pixel-ratio: #{$value / 1dppx})';
      $moz: '(#{$feature}-moz-device-pixel-ratio: #{$value / 1dppx})';
      $fallback: '(#{$feature}resolution: #{$value / 1dppx * 96dpi})';
      // Append to output
      $output: append($output, $standard, space);
      $output: append($output, $webkit, space);
      $output: append($output, $moz, space);
      $output: append($output, $fallback, space);
    }

  }

  @return $output;
}
