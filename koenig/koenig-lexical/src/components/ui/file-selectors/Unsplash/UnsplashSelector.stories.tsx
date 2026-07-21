import UnsplashImage from './UnsplashImage';
import UnsplashSelector from './UnsplashSelector';
import UnsplashZoomed from './UnsplashZoomed';
import {GalleryLayout, MasonryColumn} from '../Unsplash/UnsplashGallery';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';
import type {UnsplashPhotoPayload} from './UnsplashImage';

const story: Meta<typeof UnsplashSelector> = {
    title: 'File Selectors/Unsplash',
    component: UnsplashSelector,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const GalleryTemplate: StoryFn<ComponentProps<typeof UnsplashImage>> = (args) => {
    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 w-full min-w-[initial]">
                <UnsplashSelector closeModal={() => {}} handleSearch={() => {}}>
                    <GalleryLayout>
                        <MasonryColumn>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                        </MasonryColumn>
                        <MasonryColumn>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                        </MasonryColumn>
                        <MasonryColumn>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                            <UnsplashImage {...args}/>
                        </MasonryColumn>
                    </GalleryLayout>
                </UnsplashSelector>
            </div>
        </div>
    );
};

export const Gallery: StoryFn<ComponentProps<typeof UnsplashImage>> = GalleryTemplate.bind({});

Gallery.args = {
    zoomed: false,
    selectImg: () => {},
    insertImage: () => {},
    srcUrl: 'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080',
    alt: 'alt text here',
    links: {
        download: 'https://unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4',
        html: 'https://unsplash.com/photos/OudVFouGJmM',
        download_location: 'https://api.unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4'
    },
    likes: 69,
    user: {
        name: 'John Doe',
        links: {html: 'https://unsplash.com/@johndoe'},
        profile_image: {
            small: 'https://images.unsplash.com/profile-1600184424687-de96bd61fa67image?ixlib=rb-4.0.3&crop=faces&fit=crop&w=32&h=32'
        }
    },
    urls: {
        regular: 'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080'
    },
    height: 500,
    width: 500
};

const ZoomedTemplate: StoryFn<ComponentProps<typeof UnsplashZoomed>> = (args) => {
    return (
        <div className="w-full">
            <UnsplashSelector closeModal={() => {}} handleSearch={() => {}}>
                <GalleryLayout {...args}>
                    <UnsplashZoomed {...args}/>
                </GalleryLayout>
            </UnsplashSelector>
        </div>
    );
};

export const Zoomed: StoryFn<ComponentProps<typeof UnsplashZoomed>> = ZoomedTemplate.bind({});

const zoomedPayload: UnsplashPhotoPayload = {
    id: 'OudVFouGJmM',
    srcUrl: 'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080',
    alt: 'alt text here',
    links: {
        download: 'https://unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4',
        html: 'https://unsplash.com/photos/OudVFouGJmM',
        download_location: 'https://api.unsplash.com/photos/OudVFouGJmM/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4'
    },
    likes: 69,
    user: {
        name: 'John Doe',
        links: {html: 'https://unsplash.com/@johndoe'},
        profile_image: {
            small: 'https://images.unsplash.com/profile-1600184424687-de96bd61fa67image?ixlib=rb-4.0.3&crop=faces&fit=crop&w=32&h=32'
        }
    },
    urls: {
        regular: 'https://images.unsplash.com/photo-1670171336566-6f08f1fbf648?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjcwMjI0MDg4&ixlib=rb-4.0.3&q=80&w=1080'
    },
    height: 500,
    width: 500
};

Zoomed.args = {
    zoomed: zoomedPayload,
    payload: zoomedPayload
};
