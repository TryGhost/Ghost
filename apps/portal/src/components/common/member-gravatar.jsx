import UserIcon from '../../images/icons/user.svg?react';

const Styles = ({ style = {} }) => {
  return {
    avatarContainer: {
      ...(style.avatarContainer || {}), // Override any custom style
    },
    gravatar: {
      ...(style.avatarContainer || {}), // Override any custom style
    },
    userIcon: {
      width: '34px',
      height: '34px',
      color: '#fff',
      ...(style.userIcon || {}), // Override any custom style
    },
  };
};

function MemberGravatar({ gravatar, style }) {
  const Style = Styles({ style });
  return (
    <figure
      className="gh-portal-avatar relative mx-0 mb-2 mt-0 flex items-center justify-center overflow-hidden rounded-[999px]"
      style={Style.avatarContainer}
    >
      <UserIcon style={Style.userIcon} />
      {gravatar ? (
        <img
          className="absolute -inset-0.5 block h-[calc(100%+4px)] w-[calc(100%+4px)] max-w-none opacity-100"
          style={Style.gravatar}
          src={gravatar}
          alt=""
        />
      ) : null}
    </figure>
  );
}

export default MemberGravatar;
