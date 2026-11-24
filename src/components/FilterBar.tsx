import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

interface Props {
  initialCardinality: string;
  onSubmit: (value: string) => void;
  onReset: () => void;
}

export function FilterBar({ initialCardinality, onSubmit, onReset }: Props) {
  const [cardinality, setCardinality] = useState(initialCardinality);
  return (
    <Form className="filter-cardinality-box" onSubmit={(event) => { event.preventDefault(); onSubmit(cardinality); }}>
      <Form.Label htmlFor="num-query">Число строк (точное значение)</Form.Label>
      <div className="search-form-row">
        <div className="search-input-box">
          <Form.Control type="number" id="num-query" min="0" max="2147483647" step="1" placeholder="Не ограничено" className="search-input-field" value={cardinality} onChange={(event) => setCardinality(event.target.value)} />
        </div>
        <Button type="submit" className="btn-search-action">Найти</Button>
      </div>
      <button type="button" className="catalog-reset" onClick={() => { setCardinality(''); onReset(); }}>Сбросить фильтр</button>
    </Form>
  );
}
