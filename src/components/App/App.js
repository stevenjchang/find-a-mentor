import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import 'react-tippy/dist/tippy.css';

import { useCallback, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components/macro';
import { ToastContainer } from 'react-toastify';
import { Route, Switch, withRouter } from 'react-router-dom';
import MentorsList from '../MentorsList/MentorsList';
import Header from '../Header/Header';
import Modal from '../Modal/Modal';
import {
  toggleFavMentor,
  get as getFavorites,
  readFavMentorsFromLocalStorage,
  updateFavMentorsForUser,
} from '../../favoriteManager';
import { set as setWindowTitle } from '../../titleGenerator';
import { report, reportPageView } from '../../ga';
import { getMentors } from '../../api';
import { useFilters } from '../../context/filtersContext/FiltersContext';
import { useUser } from '../../context/userContext/UserContext';
import { ActionsHandler } from './ActionsHandler';
import { toast } from 'react-toastify';
import { UserProfile } from '../UserProfile/UserProfile';
import { desktop, mobile } from '../../Me/styles/shared/devices';
import { Sidebar } from '../Sidebar/Sidebar';

const App = () => {
  const [mentors, setMentors] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [filters] = useFilters();
  const { tag, country, name, language, showFavorites, showFilters } = filters;
  const [favorites, setFavorites] = useState([]);
  const { currentUser } = useUser();
  const [modal, setModal] = useState({
    title: null,
    content: null,
    onClose: null,
  });

  useEffect(() => {
    if (process.env.REACT_APP_MAINTENANCE_MESSAGE) {
      toast.warn(
        <div
          dangerouslySetInnerHTML={{
            __html: process.env.REACT_APP_MAINTENANCE_MESSAGE,
          }}
        />,
        {
          autoClose: false,
        }
      );
    }
  }, []);

  const filterMentors = useCallback(
    mentor => {
      const { tag, country, name, language } = filters;
      return (
        (!tag || mentor.tags.includes(tag)) &&
        (!country || mentor.country === country) &&
        (!name || mentor.name === name) &&
        (!language ||
          (mentor.spokenLanguages &&
            mentor.spokenLanguages.includes(language))) &&
        (!showFavorites || favorites.indexOf(mentor._id) > -1)
      );
    },
    [filters, favorites, showFavorites]
  );

  const onFavMentor = async mentor => {
    const newFavorites = toggleFavMentor(mentor, [...favorites]);
    setFavorites(newFavorites);
    report('Favorite');
  };

  useEffect(() => setWindowTitle({ tag, country, name, language }), [
    tag,
    country,
    name,
    language,
  ]);

  const initialize = useCallback(async () => {
    reportPageView();
    const favMentorsFromLocalStorage = readFavMentorsFromLocalStorage();
    Promise.all([
      currentUser &&
        getFavorites().then(favorites => {
          if (
            Array.isArray(favMentorsFromLocalStorage) &&
            favMentorsFromLocalStorage.length > 0
          ) {
            const mentors = favMentorsFromLocalStorage.filter(
              m => !favorites.includes(m)
            );
            if (mentors.length > 0) updateFavMentorsForUser(mentors);
          }
          setFavorites([
            ...new Set([...favMentorsFromLocalStorage, ...favorites]),
          ]);
        }),
      getMentors()
        .then(setMentors)
        .catch(e => {
          // eslint-disable-next-line no-console
          console.error(e);
        }),
    ]).then(() => {
      setIsReady(true);
    });
  }, [currentUser]);

  useEffect(() => {
    setWindowTitle({});
    initialize();
  }, [initialize]);

  const handleModal = (title, content, onClose) => {
    setModal({
      title,
      content,
      onClose,
    });
    report('Modal', 'open', title);
  };

  const mentorsInList = useMemo(() => mentors.filter(filterMentors), [
    mentors,
    filterMentors,
  ]);

  return (
    <div className="app">
      <ToastContainer />
      <Modal title={modal.title}>{modal.content}</Modal>
      <Layout>
        <Header />
        <Body>
          <Sidebar mentors={mentorsInList} handleModal={handleModal} />
          <Main showFilters={showFilters}>
            <Switch>
              <Route path="/" exact>
                <MentorsList
                  mentors={mentorsInList}
                  favorites={favorites}
                  onFavMentor={onFavMentor}
                  ready={isReady}
                />
              </Route>
              <Route path={`/u/:id`} exact>
                <UserProfile favorites={favorites} onFavMentor={onFavMentor} />
              </Route>
            </Switch>
          </Main>
        </Body>
      </Layout>
    </div>
  );
};

const AppWithActionHandlers = withRouter(() => (
  <ActionsHandler>
    <App />
  </ActionsHandler>
));

const Layout = styled.main`
  display: flex;
  flex-direction: column;
`;

const Body = styled.div`
  display: flex;
  @media all and (max-width: 800px) {
    flex-direction: column;
  }
`;

const Main = styled.section`
  display: flex;
  justify-content: center;

  @media ${desktop} {
    flex-grow: 1;
    margin-left: 276px;
    padding-bottom: 30px;
  }

  @media ${mobile} {
    background: #fff;
    position: relative;
    transform: translateY(0);
    transition: transform 0.3s ease;

    ${props =>
      props.showFilters &&
      `
        transform: translateY(300px);
        margin-bottom: 50px;
      `}
  }
`;

export default AppWithActionHandlers;
