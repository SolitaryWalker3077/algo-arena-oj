package com.oj.friend.entity.question.es;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDateTime;

@Document(indexName = "idx_question")
@Data
public class QuestionEs {

    @Id
    @Field(type = FieldType.Long)
    private Long questionId;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_max_word")
    private String title;

    @Field(type = FieldType.Byte)
    private Integer difficult;

    @Field(type = FieldType.Long)
    private Long timeLimit;

    @Field(type = FieldType.Long)
    private Long spaceLimit;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_max_word")
    private String content;

    @Field(type = FieldType.Text)
    private String questionCase;

    @Field(type = FieldType.Text)
    private String mainFac;

    @Field(type = FieldType.Text)
    private String defaultCode;

    @Field(type = FieldType.Date, format = DateFormat.date_hour_minute_second)
    private LocalDateTime createTime;
}
