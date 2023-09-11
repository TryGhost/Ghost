import React, {useEffect, useRef, useState} from 'react';

type IframeBufferingProps = {
  generateContent: (iframe: HTMLIFrameElement) => void;
  className?: string;
  parentClassName?: string;
  height?: string;
  width?: string;
  testId?: string;
};

const IframeBuffering: React.FC<IframeBufferingProps> = ({generateContent, className, height, width, parentClassName, testId}) => {
    const [visibleIframeIndex, setVisibleIframeIndex] = useState(0);
    const iframes = [useRef<HTMLIFrameElement>(null), useRef<HTMLIFrameElement>(null)];
    useEffect(() => {
        const invisibleIframeIndex = visibleIframeIndex === 0 ? 1 : 0;
        const iframe = iframes[invisibleIframeIndex].current;
        if (iframe) {
            generateContent(iframe);
        }

        const timer = setTimeout(() => {
            setVisibleIframeIndex(invisibleIframeIndex);
        }, 100);

        return () => {
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generateContent]);

    return (
        <div className={parentClassName} data-testId={testId}>
            <iframe
                ref={iframes[0]}
                className={`${className} ${visibleIframeIndex !== 0 ? 'z-10 opacity-0' : 'z-20 opacity-100'}`}
                frameBorder="0"
                height={height}
                title="Buffered Preview 1"
                width={width}
            ></iframe>

            <iframe
                ref={iframes[1]}
                className={`${className} ${visibleIframeIndex !== 1 ? 'z-10 opacity-0' : 'z-20 opacity-100'}`}
                frameBorder="0"
                height={height}
                title="Buffered Preview 2"
                width={width}
            ></iframe>
        </div>
    );
};

export default IframeBuffering;
