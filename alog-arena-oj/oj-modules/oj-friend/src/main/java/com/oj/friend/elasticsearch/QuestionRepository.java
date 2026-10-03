package com.oj.friend.elasticsearch;


import com.oj.friend.entity.question.es.QuestionEs;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionRepository extends ElasticsearchRepository<QuestionEs, Long> {

    Page<QuestionEs> findQuestionByDifficult(Integer difficult, Pageable pageable);

    //select  * from tb_question where (title like '%aaa%' or content like '%bbb%')  and difficulty = 1
    @Query("{\"bool\": {\"should\": [{ \"match\": { \"title\": \"?0\" } }, { \"match\": { \"content\": \"?1\" } }], \"minimum_should_match\": 1, \"must\": [{\"term\": {\"difficulty\": \"?2\"}}]}}")
    Page<QuestionEs> findByTitleOrContentAndDifficulty(String keywordTitle, String keywordContent,Integer difficult,  Pageable pageable);

    @Query("{\"bool\": {\"should\": [{ \"match\": { \"title\": \"?0\" } }, { \"match\": { \"content\": \"?1\" } }], \"minimum_should_match\": 1}}")
    Page<QuestionEs> findByTitleOrContent(String keywordTitle, String keywordContent, Pageable pageable);
}
