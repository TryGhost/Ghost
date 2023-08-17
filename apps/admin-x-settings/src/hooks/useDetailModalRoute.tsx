import {RouteContext} from '../components/providers/RoutingProvider';
import {useContext, useEffect} from 'react';

const useDetailModalRoute = <Item extends {[key in Field]: string}, Field extends string = 'id'>({route, items, field = 'id' as Field, showModal}: {
    route: string;
    field?: Field;
    items: Item[];
    showModal: (item: Item) => void;
}) => {
    const {addRouteChangeListener} = useContext(RouteContext);

    // The dependencies here are a bit tricky. We want to re-evaluate the useEffect if a new item is
    // added (because we may want to show a detail modal for the new item) but not if an existing item
    // is modified (because we likely want to remove the edit modal for that item)
    const itemIds = items.map(item => item[field]).join(',');

    useEffect(() => {
        const unsubscribe = addRouteChangeListener({route, callback: (params) => {
            const item = items.find(it => it[field] === params[field]);

            if (item) {
                showModal(item);
            }
        }});

        return unsubscribe;
    }, [route, itemIds]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useDetailModalRoute;
