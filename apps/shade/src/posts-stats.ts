// Components shared between the Posts app (apps/posts) and the Stats app (apps/stats)
// while those two apps are still separate. These are intentionally NOT patterns —
// they're Ghost-specific to the post analytics surface and live here only as an
// interim parking spot until the Posts and Stats apps merge, at which point this
// entrypoint goes away and the contents move into the merged app.
export {default as PostShareModal} from './components/posts-stats/post-share-modal';
