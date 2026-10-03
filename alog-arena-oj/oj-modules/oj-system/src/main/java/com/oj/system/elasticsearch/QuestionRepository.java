package com.oj.system.elasticsearch;

import com.oj.system.entity.es.QuestionEs;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionRepository extends ElasticsearchRepository<QuestionEs, Long> {

}
