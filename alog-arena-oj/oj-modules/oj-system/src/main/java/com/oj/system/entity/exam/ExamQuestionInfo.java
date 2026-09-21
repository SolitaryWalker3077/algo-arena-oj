package com.oj.system.entity.exam;


import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.oj.common.entity.BaseEntity;
import lombok.Data;

@Data
@TableName("tb_exam_question")
public class ExamQuestionInfo extends BaseEntity {
    @TableId(value = "EXAM_QUESTION_ID",type = IdType.ASSIGN_ID)
    private Long examQuestionId;

    private Long examId;

    private Long questionId;

    private Integer questionOrder;
}
