//////////////////////////////
// Import Pieces
//////////////////////////////
@import "triple/default";

@function breakpoint-parse-triple($feature, $empty-media, $first) {
  $parsed: '';
  $leader: '';

  // If we're forcing
  @if not ($empty-media) or not ($first) {
    $leader: 'and ';
  }

  // separate the string features from the value numbers
  $string: null;
  $numbers: null;
  @each $val in $feature {
    @if type-of($val) == string {
      $string: $val;
    }
    @else {
      @if type-of($numbers) == 'null' {
        $numbers: $val;
      }
      @else {
        $numbers: append($numbers, $val);
      }
    }
  }

  $parsed: breakpoint-parse-triple-default($string, nth($numbers, 1), nth($numbers, 2));

  @return $leader + $parsed;

}
